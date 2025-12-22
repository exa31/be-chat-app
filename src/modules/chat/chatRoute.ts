import {Request, Response, Router} from 'express';
import {asyncHandler} from '../../middleware/asyncHandler';
import {sendError, sendSuccess} from '../../utils/response';
import * as service from './chatService';
import {ChatCreateSchema} from './chatModel';
import {z} from 'zod';
import {authenticate} from '../../middleware/auth';

const router = Router();

router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const parse = ChatCreateSchema.safeParse(req.body);
    if (!parse.success) return sendError(res, 400, 'validation_error', parse.error.flatten().fieldErrors);
    // ensure created_by comes from authenticated user
    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');
    const payload = {...parse.data, created_by: authId};
    const chat = await service.createChat(payload);
    return sendSuccess(res, chat, 'chat_created', 201);
}));

router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id;
    const ok = z.string().uuid().safeParse(id);
    if (!ok.success) return sendError(res, 400, 'invalid_id');
    const chat = await service.getChat(id);
    return sendSuccess(res, chat, 'chat_found');
}));

router.get('/user/:userId', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId;
    const ok = z.string().uuid().safeParse(userId);
    if (!ok.success) return sendError(res, 400, 'invalid_id');
    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');
    // only allow if authenticated user matches the requested user
    if (authId !== userId) return sendError(res, 403, 'forbidden');
    const list = await service.listUserChats(userId);
    return sendSuccess(res, list, 'chats_list');
}));

export default router;
