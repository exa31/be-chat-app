export class HttpError extends Error {
    public status: number;
    public code?: string;

    constructor(status: number, code?: string, message?: string) {
        super(message ?? code ?? 'error');
        this.status = status;
        this.code = code;
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}

