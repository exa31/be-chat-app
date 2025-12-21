import {query} from '../../databases/postgres';
import {UserRow as UserRowType, UserWithPassword as UserWithPasswordType} from './userModel';
import {HttpError} from '../../errors/HttpError';

export type UserRow = UserRowType;
export type UserWithPassword = UserWithPasswordType;

export async function createUser(name: string, email: string, passwordHash: string, avatar?: string | null): Promise<UserRow> {
    const text = `
        INSERT INTO users (name, email, password, avatar)
        VALUES ($1, $2, $3, $4) RETURNING id, name, email, avatar, status, last_seen, created_at
    `;
    const values = [name, email.toLowerCase(), passwordHash, avatar ?? null];

    try {
        const res = await query<UserRow>(text, values);
        return res.rows[0];
    } catch (err: any) {
        // handle duplicate email (unique constraint)
        if (err?.code === '23505') {
            throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered');
        }
        throw err;
    }
}

export async function getUserById(id: string): Promise<UserRow | null> {
    const res = await query<UserRow>('SELECT id, name, email, avatar, status, last_seen, created_at FROM users WHERE id = $1', [id]);
    return res.rows[0] ?? null;
}

export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
    const res = await query<UserWithPassword>('SELECT id, name, email, password, avatar, status, last_seen, created_at FROM users WHERE email = $1', [email.toLowerCase()]);
    return res.rows[0] ?? null;
}

export async function updateStatus(userId: string, status: UserRow['status']): Promise<void> {
    await query('UPDATE users SET status = $1 WHERE id = $2', [status, userId]);
}

export async function updateLastSeen(userId: string, when: Date = new Date()): Promise<void> {
    await query('UPDATE users SET last_seen = $1 WHERE id = $2', [when.toISOString(), userId]);
}
