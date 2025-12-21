import {Response} from 'express';

export type BaseResponse<T = any> = {
    message: string;
    success: boolean;
    data: T | null;
    timestamp: string;
};

export function createBaseResponse<T = any>(message: string, success: boolean, data?: T | null): BaseResponse<T> {
    return {
        message,
        success,
        data: data ?? null,
        timestamp: new Date().toISOString(),
    };
}

export function sendSuccess(res: Response, data?: any, message = 'OK', status = 200) {
    return res.status(status).json(createBaseResponse(message, true, data));
}

export function sendError(res: Response, status = 500, message = 'error', data?: any) {
    return res.status(status).json(createBaseResponse(message, false, data));
}

