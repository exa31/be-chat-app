import dotenv from "dotenv";

dotenv.config();

class Config {
    public static readonly PORT = process.env.PORT || 3003;
    public static readonly MODE = process.env.NODE_ENV === 'development' ? 'development' : 'production';
    public static readonly JWT_SECRET = process.env.SECRET_KEY;
    public static readonly GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    public static readonly GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    public static readonly REDIS_URL = process.env.REDIS_URL;

    // Postgres settings
    public static readonly PG_HOST = process.env.PG_HOST ?? 'localhost';
    public static readonly PG_PORT = process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432;
    public static readonly PG_USER = process.env.PG_USER ?? undefined;
    public static readonly PG_PASSWORD = process.env.PG_PASSWORD ?? undefined;
    public static readonly PG_DATABASE = process.env.PG_DATABASE ?? undefined;
    public static readonly PG_MAX = process.env.PG_MAX ? Number(process.env.PG_MAX) : 10;
    public static readonly PG_IDLE_TIMEOUT_MS = process.env.PG_IDLE_TIMEOUT_MS ? Number(process.env.PG_IDLE_TIMEOUT_MS) : 30000;
    public static readonly PG_CONNECTION_TIMEOUT_MS = process.env.PG_CONNECTION_TIMEOUT_MS ? Number(process.env.PG_CONNECTION_TIMEOUT_MS) : 2000;
    public static readonly PG_SSL = process.env.PG_SSL === 'true';
}

export default Config;