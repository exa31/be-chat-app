import {Request, Response, Router} from 'express';
import * as service from './userService';
import {LoginSchema, RegisterSchema} from './userModel';
import {z} from 'zod';
import {asyncHandler} from '../../middleware/asyncHandler';
import {sendError, sendSuccess} from '../../utils/response';

const router = Router();

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const parse = RegisterSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return sendError(res, 400, 'validation_error', errors);
    }
    const payload = parse.data;
    const user = await service.registerUser(payload);
    return sendSuccess(res, user, 'user_created', 201);
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return sendError(res, 400, 'validation_error', errors);
    }
    const {email, password} = parse.data;
    const user = await service.loginByEmail(email, password);
    return sendSuccess(res, user, 'login_success');
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    // validate uuid param
    const uuidCheck = z.string().uuid().safeParse(userId);
    if (!uuidCheck.success) return sendError(res, 400, 'invalid_id');

    const user = await service.getProfile(userId);
    return sendSuccess(res, user, 'user_found');
}));

export default router;
