import {query} from '../../databases/postgres';
import {PoolClient} from 'pg';
import {ChatRow} from './chatModel';

export async function createChatWithClient(client: PoolClient, type: string, title: string | null, createdBy: string | null) {
    const res = await client.query<ChatRow>('INSERT INTO chats (type, title, created_by) VALUES ($1, $2, $3) RETURNING id, type, title, created_by, created_at', [type, title, createdBy]);
    return res.rows[0];
}

export async function addMembersWithClient(client: PoolClient, chatId: string, userIds: string[], role: string = 'member') {
    const sql = 'INSERT INTO chat_members (chat_id, user_id, role) VALUES ' + userIds.map((_, i) => `($1, $${i + 2}, $${i + 3})`).join(',');
    // this naive approach would duplicate role params; instead loop inserts
    for (const userId of userIds) {
        await client.query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)', [chatId, userId, role]);
    }
}

export async function getChatById(chatId: string) {
    const res = await query<ChatRow>('SELECT id, type, title, created_by, created_at FROM chats WHERE id = $1', [chatId]);
    return res.rows[0] ?? null;
}

export async function listChatsForUser(userId: string) {
    const res = await query<ChatRow>(`SELECT c.id, c.type, c.title, c.created_by, c.created_at
                                      FROM chats c
                                               JOIN chat_members m ON m.chat_id = c.id
                                      WHERE m.user_id = $1`, [userId]);
    return res.rows;
}

