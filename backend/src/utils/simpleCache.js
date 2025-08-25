// src/utils/simpleCache.js
const store = new Map();

export function cacheGet(key) {
  const hit = store.get(key);
  if (!hit) return null;
  if (hit.expireAt && hit.expireAt < Date.now()) {
    store.delete(key);
    return null;
  }
  return hit.value;
}

export function cacheSet(key, value, ttlMs = 60_000) {
  store.set(key, { value, expireAt: ttlMs ? Date.now() + ttlMs : null });
}

export function buildKey(prefix, obj) {
  return `${prefix}:${JSON.stringify(obj, Object.keys(obj).sort())}`;
}

export function cacheWrap(prefix, params, ttlMs, fn) {
  const key = buildKey(prefix, params);
  const hit = cacheGet(key);
  if (hit != null) return Promise.resolve(hit);
  return Promise.resolve(fn()).then((val) => {
    cacheSet(key, val, ttlMs);
    return val;
  });
}
