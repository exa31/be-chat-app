import {query} from '../../databases/postgres';
import {ChatRequestRow} from './chatRequestModel';
import {PoolClient} from 'pg';
import {HttpError} from '../../errors/HttpError';

export async function createRequestWithClient(client: PoolClient, senderId: string, receiverId: string): Promise<ChatRequestRow> {
    const text = `INSERT INTO chat_requests (sender_id, receiver_id)
                  VALUES ($1, $2) RETURNING id, sender_id, receiver_id, status, created_at, responded_at`;
    try {
        const res = await client.query<ChatRequestRow>(text, [senderId, receiverId]);
        return res.rows[0];
    } catch (err: any) {
        if (err?.code === '23505') {
            throw new HttpError(409, 'REQUEST_EXISTS', 'A pending request already exists between these users');
        }
        throw err;
    }
}

export async function createRequest(senderId: string, receiverId: string): Promise<ChatRequestRow> {
    const text = `INSERT INTO chat_requests (sender_id, receiver_id)
                  VALUES ($1, $2) RETURNING id, sender_id, receiver_id, status, created_at, responded_at`;
    try {
        const res = await query<ChatRequestRow>(text, [senderId, receiverId]);
        return res.rows[0];
    } catch (err: any) {
        if (err?.code === '23505') {
            throw new HttpError(409, 'REQUEST_EXISTS', 'A pending request already exists between these users');
        }
        throw err;
    }
}

export async function findById(id: string): Promise<ChatRequestRow | null> {
    const res = await query<ChatRequestRow>('SELECT id, sender_id, receiver_id, status, created_at, responded_at FROM chat_requests WHERE id = $1', [id]);
    return res.rows[0] ?? null;
}

export async function findPendingBetween(userA: string, userB: string): Promise<ChatRequestRow | null> {
    const res = await query<ChatRequestRow>(`SELECT id, sender_id, receiver_id, status, created_at, responded_at
                                             FROM chat_requests
                                             WHERE ((sender_id = $1 AND receiver_id = $2)
                                                 OR (sender_id = $2 AND receiver_id = $1))
                                               AND status = 'pending'`, [userA, userB]);
    return res.rows[0] ?? null;
}

export async function listForUser(userId: string): Promise<ChatRequestRow[]> {
    const res = await query<ChatRequestRow>('SELECT id, sender_id, receiver_id, status, created_at, responded_at FROM chat_requests WHERE receiver_id = $1 ORDER BY created_at DESC', [userId]);
    return res.rows;
}

export async function updateStatusWithClient(client: PoolClient, id: string, status: 'accepted' | 'rejected'): Promise<ChatRequestRow | null> {
    const res = await client.query<ChatRequestRow>('UPDATE chat_requests SET status = $1, responded_at = current_timestamp WHERE id = $2 RETURNING id, sender_id, receiver_id, status, created_at, responded_at', [status, id]);
    return res.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<boolean> {
    const res = await query('DELETE FROM chat_requests WHERE id = $1', [id]);
    const cnt = (res && (res as any).rowCount) ?? 0;
    return cnt > 0;
}
