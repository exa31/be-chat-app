import {NextFunction, Request, Response} from "express";
import winston from "winston";

// add custom colors for log levels
winston.addColors({
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
});

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        // colorize level (and optionally the whole message)
        winston.format.colorize({all: false}),
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({level, message, timestamp}) => {
            const stack = new Error().stack?.split("\n")[3]?.trim() || "";
            // timestamp and level will be colorized by colorize(); message remains readable
            return `[${timestamp}] ${level} ${stack} - ${typeof message === "string" ? message : JSON.stringify(message)}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                // Make console output fully colored and readable
                winston.format.colorize({all: true}),
                winston.format.simple()
            ),
        }),
    ],
});

export const logRequest = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
};
