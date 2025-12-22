import {NextFunction, Request, Response} from 'express';
import * as tokenService from '../modules/auth/tokenService';
import {sendError} from '../utils/response';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
    try {
        const authHeader = String(req.headers.authorization ?? '');
        let token: string | null = null;
        if (authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
        // fallback to access_token cookie
        if (!token && (req as any).cookies) token = (req as any).cookies['access_token'] ?? null;

        if (!token) return sendError(res, 401, 'missing_token');

        let payload: any;
        try {
            payload = tokenService.verifyAccessToken(token);
        } catch (err) {
            return sendError(res, 401, 'invalid_token');
        }

        // Attach minimal user info to request
        (req as any).user = {
            id: payload?.sub,
            email: payload?.email,
            raw: payload,
        };

        return next();
    } catch (err) {
        return sendError(res, 500, 'auth_error');
    }
}

