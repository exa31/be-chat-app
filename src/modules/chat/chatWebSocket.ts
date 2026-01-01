import * as ws from '../../lib/websocket';
import {Socket} from 'socket.io';
import {z} from 'zod';

// Type definitions
type JoinChatPayload = {
    chatId: string;
};

type SendMessagePayload = {
    chatId: string;
    content: string;
};

type TypingPayload = {
    chatId: string;
    isTyping: boolean;
};

// Validation schemas
const JoinChatSchema = z.object({
    chatId: z.string().uuid(),
});

const SendMessageSchema = z.object({
    chatId: z.string().uuid(),
    content: z.string().min(1).max(5000),
});

const TypingSchema = z.object({
    chatId: z.string().uuid(),
    isTyping: z.boolean(),
});

/**
 * Register all WebSocket event handlers for chat module
 */
export function registerChatWebSocketHandlers() {
    // Handler: Join chat room
    ws.on<JoinChatPayload>('chat:join', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        // Validate payload
        const parsed = JoinChatSchema.safeParse(data);
        if (!parsed.success) {
            socket.emit('error', {
                event: 'chat:join',
                message: 'Invalid payload',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const {chatId} = parsed.data;

        // TODO: Verify user is member of this chat
        // const isMember = await chatService.isUserMember(chatId, userId);
        // if (!isMember) {
        //     socket.emit('error', {event: 'chat:join', message: 'Access denied'});
        //     return;
        // }

        // Join the room
        await ws.joinRoom(socket.id, chatId);

        // TODO: Load recent messages
        // const messages = await messageService.getRecentMessages(chatId, 50);

        // Confirm join
        socket.emit('chat:joined', {
            chatId,
            timestamp: new Date().toISOString(),
        });

        // Notify others in the room
        socket.to(chatId).emit('chat:user_joined', {
            chatId,
            userId,
            timestamp: new Date().toISOString(),
        });

        // eslint-disable-next-line no-console
        console.info(`[websocket] User ${userId} joined chat ${chatId}`);
    });

    // Handler: Leave chat room
    ws.on<JoinChatPayload>('chat:leave', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        const parsed = JoinChatSchema.safeParse(data);
        if (!parsed.success) {
            socket.emit('error', {
                event: 'chat:leave',
                message: 'Invalid payload',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const {chatId} = parsed.data;

        // Leave the room
        await ws.leaveRoom(socket.id, chatId);

        // Confirm leave
        socket.emit('chat:left', {
            chatId,
            timestamp: new Date().toISOString(),
        });

        // Notify others
        socket.to(chatId).emit('chat:user_left', {
            chatId,
            userId,
            timestamp: new Date().toISOString(),
        });

        // eslint-disable-next-line no-console
        console.info(`[websocket] User ${userId} left chat ${chatId}`);
    });

    // Handler: Send message
    ws.on<SendMessagePayload>('chat:send_message', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        const parsed = SendMessageSchema.safeParse(data);
        if (!parsed.success) {
            socket.emit('error', {
                event: 'chat:send_message',
                message: 'Invalid payload',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const {chatId, content} = parsed.data;

        // TODO: Verify user is member of this chat
        // const isMember = await chatService.isUserMember(chatId, userId);
        // if (!isMember) {
        //     socket.emit('error', {event: 'chat:send_message', message: 'Access denied'});
        //     return;
        // }

        // TODO: Save message to database
        // const message = await messageService.createMessage({
        //     chatId,
        //     userId,
        //     content,
        // });

        // Temporary message object (replace with actual DB result)
        const messageId = `msg-${Date.now()}`;
        const timestamp = new Date().toISOString();

        // Emit to all users in the room (including sender)
        ws.emitToRoom(chatId, 'chat:new_message', {
            id: messageId,
            chatId,
            userId,
            content,
            createdAt: timestamp,
        });

        // eslint-disable-next-line no-console
        console.info(`[websocket] User ${userId} sent message to chat ${chatId}`);
    });

    // Handler: Typing indicator
    ws.on<TypingPayload>('chat:typing', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        const parsed = TypingSchema.safeParse(data);
        if (!parsed.success) {
            return; // Silent fail for typing indicator
        }

        const {chatId, isTyping} = parsed.data;

        // Broadcast to others in the room (exclude sender)
        socket.to(chatId).emit('chat:user_typing', {
            chatId,
            userId,
            isTyping,
            timestamp: new Date().toISOString(),
        });
    });

    // Handler: Mark message as read
    ws.on<{ chatId: string; messageId: string }>('chat:mark_read', async (socket: Socket, data) => {
        const userId = (socket as any).userId;

        const parsed = z.object({
            chatId: z.string().uuid(),
            messageId: z.string().uuid(),
        }).safeParse(data);

        if (!parsed.success) {
            socket.emit('error', {
                event: 'chat:mark_read',
                message: 'Invalid payload',
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }

        const {chatId, messageId} = parsed.data;

        // TODO: Update last_read_message_id in chat_members
        // await chatService.updateLastReadMessage(chatId, userId, messageId);

        // Notify others that this user has read up to this message
        socket.to(chatId).emit('chat:message_read', {
            chatId,
            userId,
            messageId,
            timestamp: new Date().toISOString(),
        });
    });

    // Handler: Get online users in chat
    ws.on<{ chatId: string }>('chat:get_online_users', async (socket: Socket, data) => {
        const parsed = z.object({
            chatId: z.string().uuid(),
        }).safeParse(data);

        if (!parsed.success) {
            socket.emit('error', {
                event: 'chat:get_online_users',
                message: 'Invalid payload',
            });
            return;
        }

        const {chatId} = parsed.data;

        // Get all socket IDs in the room
        const socketIds = await ws.getSocketsInRoom(chatId);

        // TODO: Map socket IDs to user IDs
        // For now, return count
        socket.emit('chat:online_users', {
            chatId,
            count: socketIds.length,
            socketIds, // In production, return userIds instead
        });
    });

    // eslint-disable-next-line no-console
    console.info('[websocket] Chat handlers registered');
}

/**
 * Emit notification to specific user (by userId)
 * Useful for sending notifications when user is online
 */
export async function notifyUser(userId: string, event: string, data: any): Promise<void> {
    // TODO: Map userId to socketId (can use Redis or in-memory Map)
    // For now, this is a placeholder
    // const socketId = await getSocketIdByUserId(userId);
    // if (socketId) {
    //     ws.emitToSocket(socketId, event, data);
    // }
}

/**
 * Send message notification to all members of a chat
 */
export function notifyNewMessage(chatId: string, message: any): void {
    ws.emitToRoom(chatId, 'chat:new_message', message);
}

/**
 * Notify chat members that request was accepted and chat was created
 */
export function notifyChatCreated(chatId: string, participants: string[]): void {
    // Emit to both users
    ws.emitToRoom(chatId, 'chat:created', {
        chatId,
        timestamp: new Date().toISOString(),
    });
}

