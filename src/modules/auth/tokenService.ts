import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import Config from '../../config';
import * as refreshRepo from '../token/refreshTokenRepository';
import {PoolClient} from 'pg';

const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 30);
const REFRESH_ROTATE_THRESHOLD_DAYS = Number(process.env.REFRESH_ROTATE_THRESHOLD_DAYS ?? 7);

function getJwtSecret() {
    const secret = process.env.JWT_SECRET ?? Config.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not set');
    return secret;
}

export function signAccessToken(payload: object): string {
    const secret = getJwtSecret();
    return jwt.sign(payload, secret, {algorithm: 'HS256', expiresIn: ACCESS_TOKEN_EXPIRES_IN});
}

export function verifyAccessToken(token: string) {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as any;
    if (payload?.typ && payload.typ !== 'access') throw new Error('invalid_token_type');
    return payload;
}

export function signRefreshToken(userId: string): { token: string; expiresAt: Date } {
    const secret = getJwtSecret();
    const jti = crypto.randomBytes(16).toString('hex');
    const expiresInSeconds = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60; // seconds
    const options: jwt.SignOptions = {algorithm: 'HS256', expiresIn: expiresInSeconds};
    const token = jwt.sign({sub: userId, typ: 'refresh', jti}, secret, options);
    const decoded = jwt.decode(token) as any;
    const exp = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    return {token, expiresAt: exp};
}

export async function createRefreshToken(userId: string, client?: PoolClient): Promise<{
    token: string;
    expiresAt: Date
}> {
    const {token, expiresAt} = signRefreshToken(userId);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (client) {
        await refreshRepo.saveRefreshTokenWithClient(client, {userId, tokenHash, expiresAt});
    } else {
        await refreshRepo.saveRefreshToken({userId, tokenHash, expiresAt});
    }
    return {token, expiresAt};
}

export function verifyRefreshJwt(token: string) {
    const secret = getJwtSecret();
    let payload: any;
    try {
        payload = jwt.verify(token, secret) as any;
    } catch (err) {
        throw new Error('invalid_refresh_token');
    }

    // ensure token type is refresh
    if (payload?.typ !== 'refresh') throw new Error('invalid_refresh_type');
    return payload;
}

export async function verifyRefreshToken(token: string, client?: PoolClient) {
    // verify signature & type
    const payload = verifyRefreshJwt(token);
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // if client provided, use client lookup (transactional), else normal lookup
    const row = client ? await refreshRepo.findByHashWithClient(client, tokenHash) : await refreshRepo.findByHash(tokenHash);
    if (row) {
        return {payload, row};
    }

    // If no active row found, check if there's any row (revoked) => possible reuse
    const any = await refreshRepo.findAnyByHash(tokenHash);
    if (any && any.revoked) {
        // revoke all tokens for this user to prevent further abuse
        await refreshRepo.revokeAllForUser(any.user_id);
        const e: any = new Error('refresh_token_reuse_detected');
        e.code = 'REFRESH_TOKEN_REUSE';
        throw e;
    }

    throw new Error('refresh_token_not_found');
}

export async function revokeRefreshToken(token: string, client?: PoolClient): Promise<boolean> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    if (client) return refreshRepo.revokeByHashWithClient(client, tokenHash);
    return refreshRepo.revokeByHash(tokenHash);
}

export async function rotateRefreshTokenIfNeeded(token: string, client?: PoolClient): Promise<{
    rotated: boolean;
    token: string;
    expiresAt: Date;
    userId: string
}> {
    // validate and lookup
    const {payload, row} = await verifyRefreshToken(token, client);
    const userId = payload.sub as string;
    const expiresAt = new Date(row.expires_at);

    const now = Date.now();
    const remainingMs = expiresAt.getTime() - now;
    const thresholdMs = REFRESH_ROTATE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    if (remainingMs <= thresholdMs) {
        // rotate
        if (client) {
            await refreshRepo.revokeByHashWithClient(client, crypto.createHash('sha256').update(token).digest('hex'));
            const {token: newToken, expiresAt: newExpires} = await createRefreshToken(userId, client);
            return {rotated: true, token: newToken, expiresAt: newExpires, userId};
        }
        await revokeRefreshToken(token);
        const {token: newToken, expiresAt: newExpires} = await createRefreshToken(userId);
        return {rotated: true, token: newToken, expiresAt: newExpires, userId};
    }

    // not rotated, return existing
    return {rotated: false, token, expiresAt, userId};
}
