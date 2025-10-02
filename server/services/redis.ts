import Redis from 'ioredis';

class RedisService {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Connected to Redis');
    });
  }

  // OTP Management
  async setOTP(identifier: string, otp: string, ttl = 300): Promise<void> {
    const key = `otp:${identifier}`;
    await this.client.setex(key, ttl, otp);
  }

  async getOTP(identifier: string): Promise<string | null> {
    const key = `otp:${identifier}`;
    return await this.client.get(key);
  }

  async deleteOTP(identifier: string): Promise<void> {
    const key = `otp:${identifier}`;
    await this.client.del(key);
  }

  async incrementOTPAttempts(identifier: string, ttl = 300): Promise<number> {
    const key = `otp_attempts:${identifier}`;
    const attempts = await this.client.incr(key);
    if (attempts === 1) {
      await this.client.expire(key, ttl);
    }
    return attempts;
  }

  async getOTPAttempts(identifier: string): Promise<number> {
    const key = `otp_attempts:${identifier}`;
    const attempts = await this.client.get(key);
    return attempts ? parseInt(attempts, 10) : 0;
  }

  // Session Management
  async setSession(userId: string, token: string, ttl = 86400): Promise<void> {
    const key = `session:${userId}`;
    await this.client.setex(key, ttl, token);
  }

  async getSession(userId: string): Promise<string | null> {
    const key = `session:${userId}`;
    return await this.client.get(key);
  }

  async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    await this.client.del(key);
  }

  // Rate Limiting
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
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
  }

  // Queue Management
  async queueWebhookEvent(provider: string, event: any): Promise<void> {
    const queueKey = `webhooks:${provider}`;
    await this.client.lpush(queueKey, JSON.stringify(event));
  }

  async dequeueWebhookEvent(provider: string): Promise<any | null> {
    const queueKey = `webhooks:${provider}`;
    const event = await this.client.rpop(queueKey);
    return event ? JSON.parse(event) : null;
  }

  async queueNotification(notification: any): Promise<void> {
    const queueKey = 'notifications:queue';
    await this.client.lpush(queueKey, JSON.stringify(notification));
  }

  async dequeueNotification(): Promise<any | null> {
    const queueKey = 'notifications:queue';
    const notification = await this.client.rpop(queueKey);
    return notification ? JSON.parse(notification) : null;
  }

  // Idempotency
  async setIdempotencyKey(key: string, ttl = 86400): Promise<boolean> {
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  async checkIdempotencyKey(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // Cache Management
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await this.client.setex(key, ttl, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async get(key: string): Promise<any | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  // List operations
  async lpush(key: string, value: any): Promise<void> {
    await this.client.lpush(key, JSON.stringify(value));
  }

  async rpop(key: string): Promise<any | null> {
    const value = await this.client.rpop(key);
    return value ? JSON.parse(value) : null;
  }

  async llen(key: string): Promise<number> {
    return await this.client.llen(key);
  }

  // Cleanup
  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redisService = new RedisService();
