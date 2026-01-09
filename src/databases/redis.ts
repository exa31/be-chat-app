import {createClient, RedisClientType} from 'redis';
import Config from '../config';

export type RedisConfig = {
    url?: string;
    socket?: {
        host?: string;
        port?: number;
        reconnectStrategy?: (retries: number) => number | Error;
    };
};

let redisClient: RedisClientType | null = null;

function buildRedisConfig(cfg?: Partial<RedisConfig>) {
    const url = cfg?.url ?? Config.REDIS_URL;

    if (url) {
        return {url};
    }

    return {
        socket: {
            host: cfg?.socket?.host ?? 'localhost',
            port: cfg?.socket?.port ?? 6379,
            reconnectStrategy: cfg?.socket?.reconnectStrategy ?? ((retries: number) => {
                if (retries > 10) {
                    return new Error('[redis] max reconnection attempts reached');
                }
                return Math.min(retries * 50, 500);
            }),
        },
    };
}

function delay(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}

export async function initRedis(cfg?: Partial<RedisConfig>, options?: {
    retries?: number;
    initialDelayMs?: number;
    factor?: number;
}): Promise<void> {
    if (redisClient) {
        return;
    }

    const redisConfig = buildRedisConfig(cfg);
    redisClient = createClient(redisConfig as any);

    redisClient.on('error', (err: Error) => {
        console.error('[redis] error:', err.message);
    });

    redisClient.on('connect', () => {
        console.info('[redis] connecting...');
    });

    redisClient.on('ready', () => {
        console.info('[redis] ready');
    });

    redisClient.on('reconnecting', () => {
        console.warn('[redis] reconnecting...');
    });

    redisClient.on('end', () => {
        console.info('[redis] connection closed');
    });

    const retries = options?.retries ?? 5;
    const initialDelayMs = options?.initialDelayMs ?? 200;
    const factor = options?.factor ?? 2;

    let attempt = 0;
    let lastErr: Error | null = null;

    while (attempt < retries) {
        try {
            await redisClient.connect();
            const configInfo = redisConfig.url ?? `${(redisConfig as any).socket?.host}:${(redisConfig as any).socket?.port}`;
            console.info(`[redis] connected to ${configInfo}`);
            return;
        } catch (err: any) {
            lastErr = err;
            attempt += 1;
            const wait = initialDelayMs * Math.pow(factor, attempt - 1);
            console.warn(`[redis] connect attempt ${attempt} failed (${err?.message}). retrying in ${wait}ms`);
            await delay(wait);
        }
    }

    // If we are here, all attempts failed
    try {
        await redisClient.quit();
    } catch (_) {
        // ignore
    }
    redisClient = null;
    throw new Error(`[redis] could not establish a connection after ${retries} attempts. last error: ${lastErr?.message}`);
}

export function getRedisClient(): RedisClientType {
    if (!redisClient) {
        throw new Error('Redis client not initialized. Call initRedis() first.');
    }
    if (!redisClient.isOpen) {
        throw new Error('Redis client is not connected.');
    }
    return redisClient;
}

export async function set(key: string, value: string, expiryInSeconds?: number): Promise<void> {
    const client = getRedisClient();
    if (expiryInSeconds) {
        await client.setEx(key, expiryInSeconds, value);
    } else {
        await client.set(key, value);
    }
}

export async function get(key: string): Promise<string | null> {
    const client = getRedisClient();
    return client.get(key);
}

export async function del(key: string): Promise<number> {
    const client = getRedisClient();
    return client.del(key);
}

export async function exists(key: string): Promise<number> {
    const client = getRedisClient();
    return client.exists(key);
}

export async function expire(key: string, seconds: number): Promise<boolean> {
    const client = getRedisClient();
    const result = await client.expire(key, seconds);
    return result === 1;
}

export async function ttl(key: string): Promise<number> {
    const client = getRedisClient();
    return client.ttl(key);
}

export async function setJson<T = any>(key: string, value: T, expiryInSeconds?: number): Promise<void> {
    const client = getRedisClient();
    const jsonString = JSON.stringify(value);
    if (expiryInSeconds) {
        await client.setEx(key, expiryInSeconds, jsonString);
    } else {
        await client.set(key, jsonString);
    }
}

export async function getJson<T = any>(key: string): Promise<T | null> {
    const client = getRedisClient();
    const value = await client.get(key);
    if (!value) return null;
    try {
        return JSON.parse(value) as T;
    } catch (err) {
        console.error('[redis] failed to parse JSON:', err);
        return null;
    }
}

export async function shutdownRedis(timeoutMs = 5000): Promise<void> {
    if (!redisClient) return;
    const current = redisClient;
    redisClient = null;
    try {
        const p = current.quit();
        if (timeoutMs > 0) {
            await Promise.race([
                p,
                delay(timeoutMs).then(() => {
                    throw new Error('[redis] shutdown timed out');
                }),
            ]);
        } else {
            await p;
        }
    } finally {
        console.info('[redis] client shut down');
    }
}

export {redisClient};
export type {RedisClientType};

