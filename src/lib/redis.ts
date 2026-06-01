import { createClient } from 'redis';
import { env } from '../config/env';

export const redis = createClient({ url: env.REDIS_URL });

redis.on('error', (err) => console.error('Redis error:', err));
redis.on('connect', () => console.log('✅ Redis connected'));

export const connectRedis = async () => {
  await redis.connect();
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const data = await redis.get(key);
  return data ? JSON.parse(data) : null;
};

export const cacheSet = async (key: string, value: unknown, ttlSeconds = 300) => {
  await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
};

export const cacheDel = async (key: string) => {
  await redis.del(key);
};
