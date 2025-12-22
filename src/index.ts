import express from "express";
import cors from "cors";
import cookieParser from 'cookie-parser';
import Config from './config';
import {initPostgres, shutdownPostgres} from "./databases/postgres";
import userRouter from './modules/user/userRoute';
import {errorHandler} from './middleware/errorHandler';
import * as rabbit from './lib/rabbitmq';

const app = express();

app.use(cors({origin: true, credentials: true}));
app.use(express.json());
app.use(cookieParser());

// TODO: register routes here (import routers after DB init if they depend on DB)


const PORT = Number(Config.PORT) || 3003;
let server: ReturnType<typeof app.listen> | null = null;

async function start() {
    try {
        await initPostgres();
        await rabbit.connect(Config.RABBITMQ_URL, {
            retries: 5,
            initialDelayMs: 200,
            factor: 2,
            useConfirmChannel: true,
        });
        // Register routers after DB init
        app.use('/api/users', userRouter);

        // Register error handler after routers
        app.use(errorHandler);

        server = app.listen(PORT, () => {
            // eslint-disable-next-line no-console
            console.log(`Server listening on port ${PORT}`);
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