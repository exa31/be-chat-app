import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function hashPassword(raw: string, saltRounds = 10): Promise<string> {
    const pre = crypto.createHash('sha256').update(raw).digest('hex');
    return bcrypt.hash(pre, saltRounds);
}

export async function verifyPassword(raw: string, storedHash: string): Promise<boolean> {
    const pre = crypto.createHash('sha256').update(raw).digest('hex');
    return bcrypt.compare(pre, storedHash);
}

