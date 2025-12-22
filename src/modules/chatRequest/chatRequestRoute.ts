import {NextFunction, Request, Response, Router} from 'express';
import {asyncHandler} from '../../middleware/asyncHandler';
import {sendError, sendSuccess} from '../../utils/response';
import * as service from './chatRequestService';
import {z} from 'zod';
import {authenticate} from '../../middleware/auth';
import * as userRepo from '../user/userRepository';
import * as repo from './chatRequestRepository';

const router = Router();

router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const body = req.body ?? {};
    // receiver_email expected in body; sender derived from token
    const receiverParse = z.object({receiver_email: z.string().email()}).safeParse(body);
    if (!receiverParse.success) return sendError(res, 400, 'validation_error', receiverParse.error.flatten().fieldErrors);
    const senderId = (req as any).user?.id;
    if (!senderId) return sendError(res, 401, 'missing_user');

    // find receiver by email
    const receiverRow = await userRepo.getUserByEmail(receiverParse.data.receiver_email);
    if (!receiverRow) return sendError(res, 404, 'receiver_not_found');
    if (receiverRow.id === senderId) return sendError(res, 400, 'cannot_request_self');

    const payload = {sender_id: senderId, receiver_id: receiverRow.id};
    const result = await service.sendRequest(payload as any);
    return sendSuccess(res, result, 'request_created', 201);
}));

router.get('/incoming/:userId', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const check = z.string().uuid().safeParse(userId);
    if (!check.success) return sendError(res, 400, 'invalid_user_id');
    // Only allow access if userId matches token user
    const authId = (req as any).user?.id;
    if (authId !== userId) return sendError(res, 403, 'forbidden');
    const list = await service.listIncomingRequests(userId);
    return sendSuccess(res, list, 'requests_list');
}));

// middleware to load chat request by :id and attach to req.chatRequest
async function loadChatRequest(req: Request, res: Response, next: NextFunction) {
    const id = req.params.id;
    const check = z.string().uuid().safeParse(id);
    if (!check.success) return sendError(res, 400, 'invalid_id');
    const row = await repo.findById(id);
    if (!row) return sendError(res, 404, 'not_found');
    (req as any).chatRequest = row;
    return next();
}

router.post('/:id/respond', authenticate, loadChatRequest, asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const accept = Boolean(req.body?.accept === true);
    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');

    const row = (req as any).chatRequest;
    if (row.receiver_id !== authId) return sendError(res, 403, 'forbidden');

    const updated = await service.respondRequest(id, accept);
    return sendSuccess(res, updated, 'request_responded');
}));

router.delete('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');
    // ensure only sender can cancel
    const row = await repo.findById(id);
    if (!row) return sendError(res, 404, 'not_found');
    if (row.sender_id !== authId) return sendError(res, 403, 'forbidden');

    await service.cancelRequest(id, authId);
    return sendSuccess(res, null, 'request_cancelled');
}));

export default router;
