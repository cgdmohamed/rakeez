import Redis from 'ioredis';

class RedisService {
  private client: Redis;
  private isAvailable: boolean = true;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    });

    this.client.on('error', (err) => {
      this.isAvailable = false;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Redis unavailable (optional in development):', err.message);
      } else {
        console.error('Redis connection error:', err);
      }
    });

    this.client.on('connect', () => {
      this.isAvailable = true;
      console.log('Connected to Redis');
    });
  }

  // OTP Management
  async setOTP(identifier: string, otp: string, ttl = 300): Promise<void> {
    try {
      const key = `otp:${identifier}`;
      await this.client.setex(key, ttl, otp);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - OTP storage failed');
      }
      console.warn('Redis setOTP failed (optional in development)');
    }
  }

  async getOTP(identifier: string): Promise<string | null> {
    try {
      const key = `otp:${identifier}`;
      return await this.client.get(key);
    } catch (error) {
      console.warn('Redis getOTP failed (optional in development)');
      return null;
    }
  }

  async deleteOTP(identifier: string): Promise<void> {
    try {
      const key = `otp:${identifier}`;
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis deleteOTP failed (optional in development)');
    }
  }

  async incrementOTPAttempts(identifier: string, ttl = 300): Promise<number> {
    try {
      const key = `otp_attempts:${identifier}`;
      const attempts = await this.client.incr(key);
      if (attempts === 1) {
        await this.client.expire(key, ttl);
      }
      return attempts;
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - OTP rate limiting failed');
      }
      console.warn('Redis incrementOTPAttempts failed (allowing in development - no rate limit)');
      return 1;
    }
  }

  async getOTPAttempts(identifier: string): Promise<number> {
    try {
      const key = `otp_attempts:${identifier}`;
      const attempts = await this.client.get(key);
      return attempts ? parseInt(attempts, 10) : 0;
    } catch (error) {
      console.warn('Redis getOTPAttempts failed (optional in development)');
      return 0;
    }
  }

  // Session Management
  async setSession(userId: string, token: string, ttl = 86400): Promise<void> {
    try {
      const key = `session:${userId}`;
      await this.client.setex(key, ttl, token);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - Session storage failed');
      }
      console.warn('Redis setSession failed (optional in development)');
    }
  }

  async getSession(userId: string): Promise<string | null> {
    try {
      const key = `session:${userId}`;
      return await this.client.get(key);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - Session retrieval failed');
      }
      console.warn('Redis getSession failed (optional in development)');
      return null;
    }
  }

  async deleteSession(userId: string): Promise<void> {
    try {
      const key = `session:${userId}`;
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis deleteSession failed (optional in development)');
    }
  }

  // Rate Limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, window);
      }
      
      const ttl = await this.client.ttl(key);
      const resetTime = Date.now() + (ttl * 1000);
      
      return {
        allowed: current <= limit,
        remaining: Math.max(0, limit - current),
        resetTime,
      };
    } catch (error) {
      console.warn('Redis checkRateLimit failed (allowing request in development)');
      return {
        allowed: true,
        remaining: limit,
        resetTime: Date.now() + (window * 1000),
      };
    }
  }

  // Queue Management
  async queueWebhookEvent(provider: string, event: any): Promise<void> {
    try {
      const queueKey = `webhooks:${provider}`;
      await this.client.lpush(queueKey, JSON.stringify(event));
    } catch (error) {
      console.warn('Redis queueWebhookEvent failed (optional in development)');
    }
  }

  async dequeueWebhookEvent(provider: string): Promise<any | null> {
    try {
      const queueKey = `webhooks:${provider}`;
      const event = await this.client.rpop(queueKey);
      return event ? JSON.parse(event) : null;
    } catch (error) {
      console.warn('Redis dequeueWebhookEvent failed (optional in development)');
      return null;
    }
  }

  async queueNotification(notification: any): Promise<void> {
    try {
      const queueKey = 'notifications:queue';
      await this.client.lpush(queueKey, JSON.stringify(notification));
    } catch (error) {
      console.warn('Redis queueNotification failed (optional in development)');
    }
  }

  async dequeueNotification(): Promise<any | null> {
    try {
      const queueKey = 'notifications:queue';
      const notification = await this.client.rpop(queueKey);
      return notification ? JSON.parse(notification) : null;
    } catch (error) {
      console.warn('Redis dequeueNotification failed (optional in development)');
      return null;
    }
  }

  // Idempotency
  async setIdempotencyKey(key: string, ttl = 86400): Promise<boolean> {
    try {
      const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Redis unavailable - Idempotency check failed');
      }
      console.warn('Redis setIdempotencyKey failed (allowing in development - may allow duplicates)');
      return true;
    }
  }

  async checkIdempotencyKey(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.warn('Redis checkIdempotencyKey failed (optional in development)');
      return false;
    }
  }

  // Cache Management
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.warn('Redis set failed (optional in development)');
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis get failed (optional in development)');
      return null;
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.warn('Redis del failed (optional in development)');
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const exists = await this.client.exists(key);
      return exists === 1;
    } catch (error) {
      console.warn('Redis exists failed (optional in development)');
      return false;
    }
  }

  // List operations
  async lpush(key: string, value: any): Promise<void> {
    try {
      await this.client.lpush(key, JSON.stringify(value));
    } catch (error) {
      console.warn('Redis lpush failed (optional in development)');
    }
  }

  async rpop(key: string): Promise<any | null> {
    try {
      const value = await this.client.rpop(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Redis rpop failed (optional in development)');
      return null;
    }
  }

  async llen(key: string): Promise<number> {
    try {
      return await this.client.llen(key);
    } catch (error) {
      console.warn('Redis llen failed (optional in development)');
      return 0;
    }
  }

  // Cleanup
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
    } catch (error) {
      console.warn('Redis disconnect failed (optional in development)');
    }
  }
}

export const redisService = new RedisService();
