import {Request, Response, Router} from 'express';
import * as service from './userService';
import {LoginSchema, RegisterSchema} from './userModel';
import {z} from 'zod';
import {asyncHandler} from '../../middleware/asyncHandler';
import {sendError, sendSuccess} from '../../utils/response';
import * as tokenService from '../auth/tokenService';
import * as userRepo from './userRepository';
import {authenticate} from '../../middleware/auth';

const router = Router();

const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME ?? 'refresh_token';
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.REFRESH_COOKIE_SAMESITE as any) ?? 'lax',
    path: '/api',
};

router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    const parse = RegisterSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return sendError(res, 400, 'validation_error', errors);
    }
    const payload = parse.data;
    const result = await service.registerUser(payload);

    // set refresh token cookie
    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);

    return sendSuccess(res, {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user
    }, 'user_created', 201);
}));

router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    const parse = LoginSchema.safeParse(req.body);
    if (!parse.success) {
        const errors = parse.error.flatten().fieldErrors;
        return sendError(res, 400, 'validation_error', errors);
    }
    const {email, password} = parse.data;
    const result = await service.loginByEmail(email, password);

    res.cookie(REFRESH_COOKIE_NAME, result.refresh_token, REFRESH_COOKIE_OPTIONS);
    return sendSuccess(res, {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        user: result.user
    }, 'login_success');
}));

router.get('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.id;
    // validate uuid param
    const uuidCheck = z.string().uuid().safeParse(userId);
    if (!uuidCheck.success) return sendError(res, 400, 'invalid_id');

    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');
    if (authId !== userId) return sendError(res, 403, 'forbidden');

    const user = await service.getProfile(userId);
    return sendSuccess(res, user, 'user_found');
}));

// get profile of current authenticated user
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
    const authId = (req as any).user?.id;
    if (!authId) return sendError(res, 401, 'missing_user');
    const user = await service.getProfile(authId);
    return sendSuccess(res, user, 'user_profile');
}));

router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const bodyToken = req.body?.refresh_token;
    const refreshToken = cookieToken ?? bodyToken;
    if (!refreshToken) return sendError(res, 400, 'missing_refresh_token');

    // rotate refresh token if it's nearing expiry
    const result = await tokenService.rotateRefreshTokenIfNeeded(refreshToken);
    const userId = result.userId;

    const user = await userRepo.getUserById(userId);
    if (!user) return sendError(res, 404, 'user_not_found');

    const accessToken = tokenService.signAccessToken({sub: user.id, email: user.email});

    // if token was rotated, set new cookie
    if (result.rotated) {
        res.cookie(REFRESH_COOKIE_NAME, result.token, REFRESH_COOKIE_OPTIONS);
    }

    return sendSuccess(res, {
        access_token: accessToken,
        refresh_token: result.rotated ? result.token : refreshToken,
        refresh_expires_at: result.expiresAt
    }, 'token_rotated');
}));

router.post('/logout', asyncHandler(async (req: Request, res: Response) => {
    const bodyToken = req.body?.refresh_token;
    const cookieToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const refreshToken = cookieToken ?? bodyToken;
    if (!refreshToken) return sendError(res, 400, 'missing_refresh_token');

    const ok = await tokenService.revokeRefreshToken(refreshToken);
    if (!ok) return sendError(res, 404, 'refresh_token_not_found');

    // clear cookie
    res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS);

    return sendSuccess(res, null, 'logged_out');
}));

export default router;
