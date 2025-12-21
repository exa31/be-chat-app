import {query} from '../../databases/postgres';
import {PoolClient} from 'pg';

export async function saveRefreshToken({userId, tokenHash, expiresAt}: {
    userId: string;
    tokenHash: string;
    expiresAt: Date
}) {
    const text = `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
                  VALUES ($1, $2, $3)`;
    await query(text, [userId, tokenHash, expiresAt.toISOString()]);
}

export async function saveRefreshTokenWithClient(client: PoolClient, {userId, tokenHash, expiresAt}: {
    userId: string;
    tokenHash: string;
    expiresAt: Date
}) {
    await client.query('INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)', [userId, tokenHash, expiresAt.toISOString()]);
}

export async function findByHash(tokenHash: string) {
    const res = await query('SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > current_timestamp', [tokenHash]);
    return res.rows[0] ?? null;
}

export async function findAnyByHash(tokenHash: string) {
    const res = await query('SELECT * FROM refresh_tokens WHERE token_hash = $1', [tokenHash]);
    return res.rows[0] ?? null;
}

export async function findByHashWithClient(client: PoolClient, tokenHash: string) {
    const res = await client.query('SELECT * FROM refresh_tokens WHERE token_hash = $1 AND revoked = false AND expires_at > current_timestamp', [tokenHash]);
    return res.rows[0] ?? null;
}

export async function revokeByHash(tokenHash: string) {
    const res = await query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
    const count = (res && (res as any).rowCount) ?? 0;
    return count > 0;
}

export async function revokeByHashWithClient(client: PoolClient, tokenHash: string) {
    const res = await client.query('UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1', [tokenHash]);
    const count = (res && (res as any).rowCount) ?? 0;
    return count > 0;
}

export async function revokeAllForUser(userId: string) {
    await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
}

export async function revokeAllForUserWithClient(client: PoolClient, userId: string) {
    await client.query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
}
