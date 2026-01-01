import {Server as HttpServer} from 'http';
import {Server, Socket} from 'socket.io';
import {ExtendedError} from 'socket.io/dist/namespace';

type IoServer = Server | null;

let io: IoServer = null;

export type WebSocketConfig = {
    cors?: {
        origin: string | string[];
        credentials?: boolean;
    };
    pingTimeout?: number;
    pingInterval?: number;
    path?: string;
};

export type MessageHandler<T = unknown> = (socket: Socket, data: T) => Promise<void> | void;

export type AuthMiddleware = (socket: Socket, next: (err?: ExtendedError) => void) => Promise<void> | void;

const eventHandlers = new Map<string, MessageHandler<any>>();
const authMiddlewares: AuthMiddleware[] = [];

/**
 * Initialize WebSocket server
 */
export function initialize(httpServer: HttpServer, config: WebSocketConfig = {}): Server {
    if (io) {
        // eslint-disable-next-line no-console
        console.info('[websocket] already initialized');
        return io;
    }

    io = new Server(httpServer, {
        cors: config.cors ?? {
            origin: '*',
            credentials: true,
        },
        pingTimeout: config.pingTimeout ?? 60000,
        pingInterval: config.pingInterval ?? 25000,
        path: config.path ?? '/socket.io',
    });

    // Apply auth middlewares
    authMiddlewares.forEach((middleware) => {
        io?.use((socket: Socket, next: (err?: ExtendedError) => void) => {
            Promise.resolve(middleware(socket, next)).catch((err) => {
                const error = err instanceof Error ? err : new Error(String(err));
                next(error);
            });
        });
    });

    io.on('connection', (socket: Socket) => {
        // eslint-disable-next-line no-console
        console.info(`[websocket] client connected: ${socket.id}`);

        // Register all event handlers
        eventHandlers.forEach((handler, event) => {
            socket.on(event, async (data: unknown) => {
                try {
                    await Promise.resolve(handler(socket, data));
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    // eslint-disable-next-line no-console
                    console.error(`[websocket] handler error for event "${event}":`, error.message);
                    socket.emit('error', {
                        event,
                        message: error.message,
                    });
                }
            });
        });

        socket.on('disconnect', (reason: string) => {
            // eslint-disable-next-line no-console
            console.info(`[websocket] client disconnected: ${socket.id}, reason: ${reason}`);
        });

        socket.on('error', (error: Error) => {
            // eslint-disable-next-line no-console
            console.error(`[websocket] socket error: ${socket.id}:`, error.message);
        });
    });

    // eslint-disable-next-line no-console
    console.info('[websocket] initialized successfully');
    return io;
}

/**
 * Register an authentication middleware
 * Must be called before initialize()
 */
export function useAuth(middleware: AuthMiddleware): void {
    authMiddlewares.push(middleware);
}

/**
 * Register an event handler
 * Can be called before or after initialize()
 */
export function on<T = unknown>(event: string, handler: MessageHandler<T>): void {
    eventHandlers.set(event, handler);
    // eslint-disable-next-line no-console
    console.info(`[websocket] registered handler for event: ${event}`);
}

/**
 * Remove an event handler
 */
export function off(event: string): boolean {
    const existed = eventHandlers.delete(event);
    if (existed) {
        // eslint-disable-next-line no-console
        console.info(`[websocket] removed handler for event: ${event}`);
    }
    return existed;
}

/**
 * Emit event to specific socket by socket ID
 */
export function emitToSocket<T = unknown>(socketId: string, event: string, data: T): boolean {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        return false;
    }

    socket.emit(event, data);
    return true;
}

/**
 * Emit event to specific room
 */
export function emitToRoom<T = unknown>(room: string, event: string, data: T): void {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    io.to(room).emit(event, data);
}

/**
 * Emit event to all connected clients
 */
export function broadcast<T = unknown>(event: string, data: T): void {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    io.emit(event, data);
}

/**
 * Join a socket to a room
 */
export async function joinRoom(socketId: string, room: string): Promise<boolean> {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        return false;
    }

    await socket.join(room);
    // eslint-disable-next-line no-console
    console.info(`[websocket] socket ${socketId} joined room: ${room}`);
    return true;
}

/**
 * Remove a socket from a room
 */
export async function leaveRoom(socketId: string, room: string): Promise<boolean> {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        return false;
    }

    await socket.leave(room);
    // eslint-disable-next-line no-console
    console.info(`[websocket] socket ${socketId} left room: ${room}`);
    return true;
}

/**
 * Get all socket IDs in a room
 */
export async function getSocketsInRoom(room: string): Promise<string[]> {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const sockets = await io.in(room).fetchSockets();
    return sockets.map((s: any) => s.id);
}

/**
 * Get all rooms a socket has joined
 */
export function getSocketRooms(socketId: string): Set<string> | null {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        return null;
    }

    return socket.rooms;
}

/**
 * Disconnect a specific socket
 */
export function disconnectSocket(socketId: string, close: boolean = false): boolean {
    if (!io) {
        throw new Error('[websocket] not initialized. Call initialize() first.');
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        return false;
    }

    socket.disconnect(close);
    return true;
}

/**
 * Get the Socket.IO server instance
 */
export function getServer(): Server | null {
    return io;
}

/**
 * Check if WebSocket server is initialized
 */
export function isInitialized(): boolean {
    return io !== null;
}

/**
 * Get total number of connected clients
 */
export function getConnectedCount(): number {
    if (!io) {
        return 0;
    }

    return io.sockets.sockets.size;
}

/**
 * Close WebSocket server
 */
export async function close(): Promise<void> {
    if (!io) {
        // eslint-disable-next-line no-console
        console.info('[websocket] already closed or not initialized');
        return;
    }

    await new Promise<void>((resolve) => {
        io?.close(() => {
            // eslint-disable-next-line no-console
            console.info('[websocket] server closed');
            resolve();
        });
    });

    io = null;
    eventHandlers.clear();
}

