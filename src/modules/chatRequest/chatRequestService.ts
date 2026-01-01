import * as repo from './chatRequestRepository';
import {CreateChatRequestInput} from './chatRequestModel';
import {HttpError} from '../../errors/HttpError';
import {executeInTransaction} from '../../databases/postgres';
import * as chatRepo from '../chat/chatRepository';

export async function sendRequest(input: CreateChatRequestInput) {
    const {sender_id, receiver_id} = input;
    if (sender_id === receiver_id) throw new HttpError(400, 'INVALID_REQUEST', 'Cannot send request to self');

    // check if a private chat already exists between them
    const hasChat = await chatRepo.hasPrivateChatBetween(sender_id, receiver_id);
    if (hasChat) throw new HttpError(409, 'CHAT_EXISTS', 'A chat already exists between these users');

    // check cooldown: sender may be under cooldown from a previous rejected request
    const cooldown = await repo.hasActiveRejectedCooldown(sender_id, receiver_id);
    if (cooldown) throw new HttpError(403, 'COOLDOWN_ACTIVE', 'You can send a new request after cooldown period');

    // ensure there is no pending request between them
    const existing = await repo.findPendingBetween(sender_id, receiver_id);
    if (existing) throw new HttpError(409, 'REQUEST_EXISTS', 'A pending request already exists between these users');

    // create request
    return await repo.createRequest(sender_id, receiver_id);
}

export async function listIncomingRequests(userId: string) {
    return await repo.listForUser(userId);
}

export async function listOutgoingRequests(userId: string) {
    return await repo.listFromUser(userId);
}

export async function respondRequest(requestId: string, accept: boolean, options?: {
    rejectedReason?: string | null;
    block?: boolean
}) {
    // Use transaction because when accepted we will create a chat and members atomically
    return await executeInTransaction(async (client) => {
        const row = await repo.findById(requestId);
        if (!row) throw new HttpError(404, 'NOT_FOUND', 'Chat request not found');
        if (row.status !== 'pending') throw new HttpError(400, 'ALREADY_RESPONDED', 'Request already responded');

        if (accept) {
            // create private chat and add both members inside the same transaction
            const chat = await chatRepo.createChatWithClient(client, 'private', null, row.sender_id ?? null);
            // set sender as admin and receiver as member
            await chatRepo.addMemberWithClient(client, chat.id, row.sender_id, 'admin');
            await chatRepo.addMemberWithClient(client, chat.id, row.receiver_id, 'member');

            const updated = await repo.updateStatusWithClient(client, requestId, 'accepted');
            return {request: updated, chat};
        }

        if (options?.block) {
            const updated = await repo.updateStatusWithClient(client, requestId, 'blocked', null, null);
            return {request: updated, chat: null};
        }

        // reject: set responded_at, rejected_reason and cooldown_until (7 days by default)
        const cooldownUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const updated = await repo.updateStatusWithClient(client, requestId, 'rejected', options?.rejectedReason ?? null, cooldownUntil);
        return {request: updated, chat: null};
    });
}

export async function cancelRequest(requestId: string, userId: string) {
    const row = await repo.findById(requestId);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Chat request not found');
    if (row.sender_id !== userId) throw new HttpError(403, 'FORBIDDEN', 'Only sender can cancel request');
    if (row.status !== 'pending') throw new HttpError(400, 'ALREADY_RESPONDED', 'Cannot cancel responded request');

    const ok = await repo.deleteById(requestId);
    if (!ok) throw new HttpError(500, 'DELETE_FAILED', 'Failed to cancel request');
    return true;
}
