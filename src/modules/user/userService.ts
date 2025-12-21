import * as repo from './userRepository';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {RegisterInput} from './userModel';
import {HttpError} from '../../errors/HttpError';
import * as tokenService from '../auth/tokenService';
import {withTransaction} from '../../databases/postgres';

function sha256(input: string) {
    return crypto.createHash('sha256').update(input).digest('hex');
}

export async function registerUser(payload: RegisterInput) {
    const {name, email, password, avatar} = payload;
    // payload already validated by route, but keep a small guard
    if (!name || !email || !password) throw new HttpError(400, 'INVALID_INPUT', 'name,email,password required');

    // First compute SHA-256 of raw password, then bcrypt the result
    const preHash = sha256(password);

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(preHash, saltRounds);

    return await withTransaction(async (client) => {
        const user = await repo.createUserWithClient(client, name, email, passwordHash, avatar ?? null);
        // create refresh token inside transaction using the same client
        const {token: refreshToken, expiresAt} = await tokenService.createRefreshToken(user.id, client);
        const accessToken = tokenService.signAccessToken({sub: user.id, email: user.email});
        return {access_token: accessToken, refresh_token: refreshToken, refresh_expires_at: expiresAt, user};
    });
}

export async function getProfile(userId: string) {
    const user = await repo.getUserById(userId);
    if (!user) {
        throw new HttpError(404, 'NOT_FOUND', 'User not found');
    }
    return user;
}

export async function loginByEmail(email: string, password: string) {
    const row = await repo.getUserByEmail(email);
    if (!row) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    // compute SHA-256 of provided password and compare with bcrypt stored hash
    const candidatePreHash = sha256(password);
    const match = await bcrypt.compare(candidatePreHash, row.password);
    if (!match) {
        throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
    }

    // return token pair + user profile (without password)
    const {password: _p, ...user} = row as any;

    const accessToken = tokenService.signAccessToken({sub: user.id, email: user.email});
    const {token: refreshToken, expiresAt} = await tokenService.createRefreshToken(user.id);

    return {access_token: accessToken, refresh_token: refreshToken, refresh_expires_at: expiresAt, user};
}
