import {NextFunction, Request, Response} from "express";
import winston from "winston";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({level, message, timestamp}) => {
            const stack = new Error().stack?.split("\n")[3]?.trim() || "";
            return `[${timestamp}] ${level.toUpperCase()} ${stack} - ${typeof message === "string" ? message : JSON.stringify(message)}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple(),
        }),
    ],
});

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Request: ${req.method} ${req.originalUrl.split('/').slice(3).join('/')}`);
    next();
};
