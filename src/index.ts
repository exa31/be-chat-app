import express from "express";
import {createServer} from 'http';
import cors from "cors";
import cookieParser from 'cookie-parser';
import Config from './config';
import {initPostgres, shutdownPostgres} from "./databases/postgres";
import userRouter from './modules/user/userRoute';
import chatRouter from './modules/chat/chatRoute';
import {errorHandler} from './middleware/errorHandler';
import * as rabbit from './lib/rabbitmq';
import * as ws from './lib/websocket';
import chatRequestRouter from './modules/chatRequest/chatRequestRoute';
import {logRequest} from './middleware/logrequest';
import {registerChatWebSocketHandlers} from './modules/chat/chatWebSocket';
import jwt from 'jsonwebtoken';

const app = express();
const httpServer = createServer(app);

app.use(cors({origin: true, credentials: true}));
app.use(express.json());
app.use(cookieParser());

// attach request logger early
app.use(logRequest);

// TODO: register routes here (import routers after DB init if they depend on DB)


const PORT = Number(Config.PORT) || 3003;
let server: typeof httpServer | null = null;

async function start() {
    try {
        await initPostgres();
        await rabbit.connect(Config.RABBITMQ_URL, {
            retries: 5,
            initialDelayMs: 200,
            factor: 2,
            useConfirmChannel: true,
        });

        // Setup WebSocket authentication middleware
        ws.useAuth((socket, next) => {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: Token missing'));
            }

            try {
                const decoded = jwt.verify(token, Config.JWT_SECRET || '') as unknown as { id: string; email: string };
                (socket as any).userId = decoded.id;
                (socket as any).userEmail = decoded.email;
                next();
            } catch (err) {
                next(new Error('Authentication error: Invalid token'));
            }
        });

        // Initialize WebSocket server
        ws.initialize(httpServer, {
            cors: {
                origin: Config.CLIENT_URL || '*',
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        // Register WebSocket event handlers
        registerChatWebSocketHandlers();

        // Register routers after DB init
        app.use('/api/users', userRouter);
        app.use('/api/chats', chatRouter);
        app.use('/api/chat-requests', chatRequestRouter);
        app.use('/api/health', (_req, res) => {
            res.status(200).send('OK');
        })

        // Register error handler after routers
        app.use(errorHandler);

        server = httpServer.listen(PORT, () => {
            // eslint-disable-next-line no-console
            console.log(`Server listening on port ${PORT}`);
            console.log(`WebSocket server ready at ws://localhost:${PORT}`);
        });
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to start server:', (err as Error).message);
        process.exit(1);
    }
}

start();

async function shutdown() {
    try {
        // eslint-disable-next-line no-console
        console.log('Shutting down...');
        await ws.close();
        await rabbit.close();
        await shutdownPostgres();
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error during shutdown:', (err as Error).message);
    } finally {
        if (server) {
            server.close(() => {
                process.exit(0);
            });
        } else {
            process.exit(0);
        }
    }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

export default app;