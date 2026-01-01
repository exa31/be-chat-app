import {query} from '../../databases/postgres';
import {PoolClient} from 'pg';
import {ChatRow} from './chatModel';

export async function createChatWithClient(client: PoolClient, type: string, title: string | null, createdBy: string | null) {
    const res = await client.query<ChatRow>('INSERT INTO chats (type, title, created_by) VALUES ($1, $2, $3) RETURNING id, type, title, created_by, created_at', [type, title, createdBy]);
    return res.rows[0];
}

export async function addMembersWithClient(client: PoolClient, chatId: string, userIds: string[], role: string = 'member') {
    for (const userId of userIds) {
        await client.query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)', [chatId, userId, role]);
    }
}

// Add helper to insert a single member with a specific role
export async function addMemberWithClient(client: PoolClient, chatId: string, userId: string, role: string = 'member') {
    await client.query('INSERT INTO chat_members (chat_id, user_id, role) VALUES ($1, $2, $3)', [chatId, userId, role]);
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

export async function hasPrivateChatBetween(userA: string, userB: string): Promise<boolean> {
    const res = await query('SELECT 1 FROM chats c JOIN chat_members cm1 ON c.id = cm1.chat_id JOIN chat_members cm2 ON c.id = cm2.chat_id WHERE c.type = $1 AND cm1.user_id = $2 AND cm2.user_id = $3 LIMIT 1', ['private', userA, userB]);
    return res.rows.length > 0;
}
