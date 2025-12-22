import * as repo from './chatRepository';
import {executeInTransaction} from '../../databases/postgres';
import {ChatCreateInput} from './chatModel';
import {HttpError} from '../../errors/HttpError';

export async function createChat(input: ChatCreateInput) {
    const {type, title, created_by, member_ids} = input;
    if (!member_ids || member_ids.length === 0) throw new HttpError(400, 'INVALID_INPUT', 'member_ids required');

    return await executeInTransaction(async (client) => {
        const chat = await repo.createChatWithClient(client, type, title ?? null, created_by ?? null);
        await repo.addMembersWithClient(client, chat.id, member_ids, 'member');
        return chat;
    });
}

export async function getChat(chatId: string) {
    const chat = await repo.getChatById(chatId);
    if (!chat) throw new HttpError(404, 'CHAT_NOT_FOUND', 'Chat not found');
    return chat;
}

export async function listUserChats(userId: string) {
    return await repo.listChatsForUser(userId);
}

