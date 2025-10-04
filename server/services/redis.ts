import Redis from 'ioredis';

// In-memory fallback for when Redis is unavailable
class InMemoryStore {
  private store = new Map<string, { value: any; expiry?: number }>();

  set(key: string, value: any, ttl?: number): void {
    const expiry = ttl ? Date.now() + (ttl * 1000) : undefined;
    this.store.set(key, { value, expiry });
  }

  get(key: string): any | null {
    const item = this.store.get(key);
    if (!item) return null;
    
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return null;
    }
    
    return item.value;
  }

  del(key: string): void {
    this.store.delete(key);
  }

  exists(key: string): boolean {
    const item = this.store.get(key);
    if (!item) return false;
    
    if (item.expiry && item.expiry < Date.now()) {
      this.store.delete(key);
      return false;
    }
    
    return true;
  }

  incr(key: string): number {
    const item = this.store.get(key);
    const currentValue = item?.value || 0;
    const newValue = currentValue + 1;
    this.store.set(key, { value: newValue, expiry: item?.expiry });
    return newValue;
  }

  clear(): void {
    this.store.clear();
  }
}

class RedisService {
  private client: Redis;
  private isAvailable: boolean = false;
  private memoryStore = new InMemoryStore();

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true, // Don't connect immediately - connect on first use
      enableOfflineQueue: false,
      retryStrategy: () => null, // No retries - fail fast
    });

    this.client.on('error', (err) => {
      this.isAvailable = false;
      if (process.env.NODE_ENV !== 'production') {
        // Silently fail in development
      } else {
        console.warn('Redis unavailable, using in-memory fallback:', err.message);
      }
    });

    this.client.on('connect', () => {
      this.isAvailable = true;
      console.log('Connected to Redis');
    });

    this.client.on('ready', () => {
      this.isAvailable = true;
      console.log('Redis ready');
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
    const key = `session:${userId}`;
    try {
      if (this.isAvailable) {
        await this.client.setex(key, ttl, token);
      } else {
        this.memoryStore.set(key, token, ttl);
      }
    } catch (error) {
      console.warn('Redis setSession failed, using in-memory fallback');
      this.memoryStore.set(key, token, ttl);
    }
  }

  async getSession(userId: string): Promise<string | null> {
    const key = `session:${userId}`;
    try {
      if (this.isAvailable) {
        return await this.client.get(key);
      } else {
        return this.memoryStore.get(key);
      }
    } catch (error) {
      console.warn('Redis getSession failed, using in-memory fallback');
      return this.memoryStore.get(key);
    }
  }

  async deleteSession(userId: string): Promise<void> {
    const key = `session:${userId}`;
    try {
      if (this.isAvailable) {
        await this.client.del(key);
      } else {
        this.memoryStore.del(key);
      }
    } catch (error) {
      console.warn('Redis deleteSession failed, using in-memory fallback');
      this.memoryStore.del(key);
    }
  }

  async storeSession(key: string, data: any, ttl?: number): Promise<void> {
    await this.set(key, data, ttl);
  }

  async getStoredSession(key: string): Promise<any | null> {
    return await this.get(key);
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
      if (this.isAvailable) {
        const serialized = JSON.stringify(value);
        if (ttl) {
          await this.client.setex(key, ttl, serialized);
        } else {
          await this.client.set(key, serialized);
        }
      } else {
        this.memoryStore.set(key, value, ttl);
      }
    } catch (error) {
      console.warn('Redis set failed, using in-memory fallback');
      this.memoryStore.set(key, value, ttl);
    }
  }

  async get(key: string): Promise<any | null> {
    try {
      if (this.isAvailable) {
        const value = await this.client.get(key);
        return value ? JSON.parse(value) : null;
      } else {
        return this.memoryStore.get(key);
      }
    } catch (error) {
      console.warn('Redis get failed, using in-memory fallback');
      return this.memoryStore.get(key);
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (this.isAvailable) {
        await this.client.del(key);
      } else {
        this.memoryStore.del(key);
      }
    } catch (error) {
      console.warn('Redis del failed, using in-memory fallback');
      this.memoryStore.del(key);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.isAvailable) {
        const exists = await this.client.exists(key);
        return exists === 1;
      } else {
        return this.memoryStore.exists(key);
      }
    } catch (error) {
      console.warn('Redis exists failed, using in-memory fallback');
      return this.memoryStore.exists(key);
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

  // Pub/Sub for WebSocket broadcasting
  async publish(channel: string, message: any): Promise<void> {
    // Skip if Redis unavailable to avoid connection errors
    if (!this.isAvailable) {
      return;
    }

    try {
      await this.client.publish(channel, JSON.stringify(message));
    } catch (error) {
      this.isAvailable = false; // Mark as unavailable on error
      if (process.env.NODE_ENV === 'production') {
        console.error('Redis publish failed:', error);
      }
    }
  }

  subscribe(channel: string, callback: (message: any) => void): void {
    // Skip subscription setup in development when Redis is not available
    if (process.env.NODE_ENV !== 'production' && !this.isAvailable) {
      return;
    }

    try {
      // Create a separate subscriber client
      const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 1,
        lazyConnect: false,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });

      subscriber.on('error', (err) => {
        if (process.env.NODE_ENV !== 'production') {
          // Silently fail in development
        } else {
          console.error('Redis subscriber error:', err);
        }
      });

      subscriber.subscribe(channel, (err) => {
        if (err && process.env.NODE_ENV === 'production') {
          console.error('Redis subscribe failed:', err.message);
        }
      });

      subscriber.on('message', (chan, msg) => {
        if (chan === channel) {
          try {
            callback(JSON.parse(msg));
          } catch (error) {
            console.warn('Redis message parse failed:', error);
          }
        }
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Redis subscribe setup failed:', error);
      }
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

  // Check if Redis is available
  get available(): boolean {
    return this.isAvailable;
  }
}

export const redisService = new RedisService();
