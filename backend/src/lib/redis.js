// src/lib/redis.js
import Redis from 'ioredis';

let redis = null;
const { REDIS_URL } = process.env;

if (REDIS_URL) {
  try {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });
    redis.on('connect', () => console.log('🔌 Redis conectado'));
    redis.on('error', (e) => console.warn('⚠️ Redis error:', e.message));
  } catch (e) {
    console.warn('⚠️ Falha ao iniciar Redis:', e.message);
    redis = null;
  }
}

export default redis;
