import {NextFunction, Request, Response} from 'express';
import {HttpError} from '../errors/HttpError';
import {sendError} from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
    if (err instanceof HttpError) {
        return sendError(res, err.status, err.code ?? 'error', {message: err.message});
    }

    console.error('Unhandled error', err);
    return sendError(res, 500, 'internal_error');
}
