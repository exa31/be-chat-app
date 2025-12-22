import * as repo from './chatRequestRepository';
import {CreateChatRequestInput} from './chatRequestModel';
import {HttpError} from '../../errors/HttpError';
import {executeInTransaction} from '../../databases/postgres';
import * as chatRepo from '../chat/chatRepository';

export async function sendRequest(input: CreateChatRequestInput) {
    const {sender_id, receiver_id} = input;
    if (sender_id === receiver_id) throw new HttpError(400, 'INVALID_REQUEST', 'Cannot send request to self');

    // ensure there is no pending request between them
    const existing = await repo.findPendingBetween(sender_id, receiver_id);
    if (existing) throw new HttpError(409, 'REQUEST_EXISTS', 'A pending request already exists between these users');

    // create request
    return await repo.createRequest(sender_id, receiver_id);
}

export async function listIncomingRequests(userId: string) {
    return await repo.listForUser(userId);
}

export async function respondRequest(requestId: string, accept: boolean) {
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

        const updated = await repo.updateStatusWithClient(client, requestId, 'rejected');
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
