import {query} from '../../databases/postgres';
import {ChatRequestResponse, ChatRequestRow} from './chatRequestModel';
import {PoolClient} from 'pg';
import {HttpError} from '../../errors/HttpError';

export async function createRequestWithClient(client: PoolClient, senderId: string, receiverId: string): Promise<ChatRequestRow> {
    const text = `INSERT INTO chat_requests (sender_id, receiver_id)
                  VALUES ($1,
                          $2) RETURNING id, sender_id, receiver_id, status, created_at, responded_at, rejected_reason, cooldown_until`;
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
                  VALUES ($1,
                          $2) RETURNING id, sender_id, receiver_id, status, created_at, responded_at, rejected_reason, cooldown_until`;
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
    const res = await query<ChatRequestRow>('SELECT id, sender_id, receiver_id, status, created_at, responded_at, rejected_reason, cooldown_until FROM chat_requests WHERE id = $1', [id]);
    return res.rows[0] ?? null;
}

export async function findPendingBetween(userA: string, userB: string): Promise<ChatRequestRow | null> {
    const res = await query<ChatRequestRow>(`SELECT id,
                                                    sender_id,
                                                    receiver_id,
                                                    status,
                                                    created_at,
                                                    responded_at,
                                                    rejected_reason,
                                                    cooldown_until
                                             FROM chat_requests
                                             WHERE ((sender_id = $1 AND receiver_id = $2)
                                                 OR (sender_id = $2 AND receiver_id = $1))
                                               AND status = 'pending'`, [userA, userB]);
    return res.rows[0] ?? null;
}

// check if there is a rejected row with active cooldown between sender and receiver (directional: sender->receiver)
export async function hasActiveRejectedCooldown(senderId: string, receiverId: string): Promise<boolean> {
    const res = await query('SELECT 1 FROM chat_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = $3 AND cooldown_until > current_timestamp LIMIT 1', [senderId, receiverId, 'rejected']);
    return (res.rows.length > 0);
}

export async function listForUser(userId: string): Promise<ChatRequestResponse[]> {
    const res = await query<ChatRequestResponse>(`SELECT cr.id,
                                                         u.name,
                                                         cr.sender_id,
                                                         cr.receiver_id,
                                                         cr.status,
                                                         cr.created_at,
                                                         cr.responded_at,
                                                         cr.rejected_reason,
                                                         cr.cooldown_until
                                                  FROM chat_requests cr
                                                           JOIN users u ON u.id = cr.sender_id
                                                  WHERE cr.receiver_id = $1
                                                    AND cr.status != 'rejected'
                                                  ORDER BY cr.created_at DESC`, [userId]);
    return res.rows;
}

export async function listFromUser(userId: string): Promise<ChatRequestResponse[]> {
    const res = await query<ChatRequestResponse>('SELECT cr.id, u.name, cr.sender_id, cr.receiver_id, cr.status, cr.created_at, cr.responded_at, cr.rejected_reason, cr.cooldown_until FROM chat_requests cr JOIN users u ON u.id = cr.receiver_id  WHERE cr.sender_id = $1 ORDER BY cr.created_at DESC', [userId]);
    return res.rows;
}

export async function updateStatusWithClient(client: PoolClient, id: string, status: 'accepted' | 'rejected' | 'blocked', rejectedReason: string | null = null, cooldownUntil: string | null = null): Promise<ChatRequestRow | null> {
    const res = await client.query<ChatRequestRow>('UPDATE chat_requests SET status = $1, responded_at = current_timestamp, rejected_reason = $2, cooldown_until = $3 WHERE id = $4 RETURNING id, sender_id, receiver_id, status, created_at, responded_at, rejected_reason, cooldown_until', [status, rejectedReason, cooldownUntil, id]);
    return res.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<boolean> {
    const res = await query('DELETE FROM chat_requests WHERE id = $1', [id]);
    const cnt = (res && (res as any).rowCount) ?? 0;
    return cnt > 0;
}
