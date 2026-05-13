import Redis from 'ioredis';
import { env } from './env';

class RedisClient {
  private client: Redis;
  private static instance: RedisClient;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis(env.REDIS_URL, {
      tls: env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: true,
      retryStrategy(times) {
        if (process.env.NODE_ENV !== 'production') return null;
        if (times > 10) {
          console.error('Redis max retries reached');
          return null;
        }
        return Math.min(times * 200, 30000);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis connected');
    });
    this.client.on('ready', () => console.log('🚀 Redis ready'));
    this.client.on('error', (err) => {
      this.isConnected = false;
      if (env.IS_PRODUCTION) {
        console.error('Redis error:', err.message);
      }
    });
    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  async connect(): Promise<void> {
    if (this.client.status === 'wait') {
      await this.client.connect();
    }
  }

  // All operations check isConnected first
  // If Redis is down — silently return null/skip
  // In production Redis is always up so this never triggers
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!this.isConnected) return;
    const data = JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, data, 'EX', ttl);
    } else {
      await this.client.set(key, data);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    await this.client.del(key);
  }

  async delMany(keys: string[]): Promise<void> {
    if (!this.isConnected || !keys.length) return;
    await this.client.del(...keys);
  }

  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected) return;
    const stream = this.client.scanStream({ match: pattern, count: 100 });
    for await (const keys of stream) {
      if (keys.length) {
        const pipeline = this.client.pipeline();
        keys.forEach((key: string) => pipeline.del(key));
        await pipeline.exec();
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isConnected) return false;
    return (await this.client.exists(key)) === 1;
  }

  async incr(key: string): Promise<number> {
    if (!this.isConnected) return 0;
    return await this.client.incr(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (!this.isConnected) return;
    await this.client.expire(key, seconds);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const cache = RedisClient.getInstance();