# WebSocket Client Examples

Contoh penggunaan WebSocket client di frontend (React/TypeScript).

## 📦 Installation (Frontend)

```bash
npm install socket.io-client
```

## 🔌 Connection Manager

```typescript
// src/lib/socketClient.ts
import {io, Socket} from 'socket.io-client';

class WebSocketClient {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private token: string | null = null;

    /**
     * Connect to WebSocket server
     */
    connect(serverUrl: string, token: string): void {
        if (this.socket?.connected) {
            console.log('Already connected');
            return;
        }

        this.token = token;
        this.socket = io(serverUrl, {
            auth: {
                token,
            },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
        });

        this.setupEventListeners();
    }

    /**
     * Setup default event listeners
     */
    private setupEventListeners(): void {
        if (!this.socket) return;

        this.socket.on('connect', () => {
            console.log('✅ WebSocket connected:', this.socket?.id);
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason: string) => {
            console.log('❌ WebSocket disconnected:', reason);
        });

        this.socket.on('error', (error: any) => {
            console.error('⚠️ WebSocket error:', error);
        });

        this.socket.io.on('reconnect_attempt', (attempt: number) => {
            console.log(`🔄 Reconnect attempt ${attempt}/${this.maxReconnectAttempts}`);
            this.reconnectAttempts = attempt;
        });

        this.socket.io.on('reconnect_failed', () => {
            console.error('❌ Reconnection failed');
        });
    }

    /**
     * Emit event to server
     */
    emit<T = any>(event: string, data: T): void {
        if (!this.socket?.connected) {
            console.warn('Socket not connected. Cannot emit event:', event);
            return;
        }
        this.socket.emit(event, data);
    }

    /**
     * Listen to event from server
     */
    on<T = any>(event: string, handler: (data: T) => void): void {
        if (!this.socket) {
            console.warn('Socket not initialized');
            return;
        }
        this.socket.on(event, handler);
    }

    /**
     * Remove event listener
     */
    off(event: string): void {
        if (!this.socket) return;
        this.socket.off(event);
    }

    /**
     * Disconnect from server
     */
    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /**
     * Get socket ID
     */
    getSocketId(): string | undefined {
        return this.socket?.id;
    }
}

// Export singleton instance
export const socketClient = new WebSocketClient();
```

## 💬 Chat Hook (React)

```typescript
// src/hooks/useChat.ts
import {useEffect, useState, useCallback} from 'react';
import {socketClient} from '../lib/socketClient';

type Message = {
    id: string;
    chatId: string;
    userId: string;
    content: string;
    createdAt: string;
};

type TypingUser = {
    userId: string;
    isTyping: boolean;
};

export function useChat(chatId: string | null) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isJoined, setIsJoined] = useState(false);
    const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
    const [onlineCount, setOnlineCount] = useState(0);

    // Join chat room
    const joinChat = useCallback(() => {
        if (!chatId) return;
        socketClient.emit('chat:join', {chatId});
    }, [chatId]);

    // Leave chat room
    const leaveChat = useCallback(() => {
        if (!chatId) return;
        socketClient.emit('chat:leave', {chatId});
        setIsJoined(false);
    }, [chatId]);

    // Send message
    const sendMessage = useCallback(
        (content: string) => {
            if (!chatId || !content.trim()) return;
            socketClient.emit('chat:send_message', {chatId, content});
        },
        [chatId]
    );

    // Send typing indicator
    const setTyping = useCallback(
        (isTyping: boolean) => {
            if (!chatId) return;
            socketClient.emit('chat:typing', {chatId, isTyping});
        },
        [chatId]
    );

    // Mark message as read
    const markAsRead = useCallback(
        (messageId: string) => {
            if (!chatId) return;
            socketClient.emit('chat:mark_read', {chatId, messageId});
        },
        [chatId]
    );

    // Get online users count
    const getOnlineUsers = useCallback(() => {
        if (!chatId) return;
        socketClient.emit('chat:get_online_users', {chatId});
    }, [chatId]);

    useEffect(() => {
        if (!chatId) return;

        // Join chat when component mounts
        joinChat();

        // Listen to events
        socketClient.on<{ chatId: string; timestamp: string }>('chat:joined', (data) => {
            console.log('Joined chat:', data);
            setIsJoined(true);
            getOnlineUsers(); // Get online users after joining
        });

        socketClient.on<Message>('chat:new_message', (message) => {
            console.log('New message:', message);
            setMessages((prev) => [...prev, message]);
        });

        socketClient.on<TypingUser>('chat:user_typing', (data) => {
            console.log('User typing:', data);
            setTypingUsers((prev) => ({...prev, [data.userId]: data.isTyping}));

            // Clear typing indicator after 3 seconds
            if (data.isTyping) {
                setTimeout(() => {
                    setTypingUsers((prev) => ({...prev, [data.userId]: false}));
                }, 3000);
            }
        });

        socketClient.on<{ chatId: string; userId: string }>('chat:user_joined', (data) => {
            console.log('User joined:', data.userId);
            getOnlineUsers();
        });

        socketClient.on<{ chatId: string; userId: string }>('chat:user_left', (data) => {
            console.log('User left:', data.userId);
            getOnlineUsers();
        });

        socketClient.on<{ chatId: string; count: number }>('chat:online_users', (data) => {
            console.log('Online users:', data.count);
            setOnlineCount(data.count);
        });

        socketClient.on<{ event: string; message: string }>('error', (error) => {
            console.error('Chat error:', error);
            // Show error toast to user
        });

        // Cleanup on unmount
        return () => {
            leaveChat();
            socketClient.off('chat:joined');
            socketClient.off('chat:new_message');
            socketClient.off('chat:user_typing');
            socketClient.off('chat:user_joined');
            socketClient.off('chat:user_left');
            socketClient.off('chat:online_users');
            socketClient.off('error');
        };
    }, [chatId, joinChat, leaveChat, getOnlineUsers]);

    return {
        messages,
        isJoined,
        typingUsers,
        onlineCount,
        sendMessage,
        setTyping,
        markAsRead,
        joinChat,
        leaveChat,
    };
}
```

## 🎨 Chat Component Example

```tsx
// src/components/ChatRoom.tsx
import React, {useState, useEffect, useRef} from 'react';
import {useChat} from '../hooks/useChat';
import {socketClient} from '../lib/socketClient';

type Props = {
    chatId: string;
    currentUserId: string;
};

export function ChatRoom({chatId, currentUserId}: Props) {
    const {messages, isJoined, typingUsers, onlineCount, sendMessage, setTyping} = useChat(chatId);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout>();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto scroll to bottom when new message arrives
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: 'smooth'});
    }, [messages]);

    // Handle typing indicator
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);

        // Send typing indicator
        if (!isTyping) {
            setIsTyping(true);
            setTyping(true);
        }

        // Clear existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Set new timeout to stop typing indicator
        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            setTyping(false);
        }, 1000);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        sendMessage(inputValue);
        setInputValue('');

        // Stop typing indicator
        setIsTyping(false);
        setTyping(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
    };

    const typingUsersList = Object.entries(typingUsers)
        .filter(([userId, typing]) => typing && userId !== currentUserId)
        .map(([userId]) => userId);

    return (
        <div className="chat-room">
            <div className="chat-header">
                <h2>Chat Room</h2>
                <span className="online-count">👥 {onlineCount} online</span>
                {!socketClient.isConnected() && (
                    <span className="disconnected">⚠️ Disconnected</span>
                )}
            </div>

            <div className="messages-container">
                {!isJoined && <div className="loading">Joining chat...</div>}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`message ${
                            message.userId === currentUserId ? 'message-own' : 'message-other'
                        }`}
                    >
                        <div className="message-content">{message.content}</div>
                        <div className="message-time">
                            {new Date(message.createdAt).toLocaleTimeString()}
                        </div>
                    </div>
                ))}

                {typingUsersList.length > 0 && (
                    <div className="typing-indicator">
                        <span>💬 {typingUsersList.length} user(s) typing...</span>
                    </div>
                )}

                <div ref={messagesEndRef}/>
            </div>

            <form onSubmit={handleSubmit} className="message-input">
                <input
                    type="text"
                    value={inputValue}
                    onChange={handleInputChange}
                    placeholder="Type a message..."
                    disabled={!isJoined}
                />
                <button type="submit" disabled={!isJoined || !inputValue.trim()}>
                    Send
                </button>
            </form>
        </div>
    );
}
```

## 🚀 App Setup

```tsx
// src/App.tsx
import React, {useEffect, useState} from 'react';
import {socketClient} from './lib/socketClient';
import {ChatRoom} from './components/ChatRoom';

function App() {
    const [isConnected, setIsConnected] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [chatId, setChatId] = useState<string | null>(null);

    useEffect(() => {
        // Get token from localStorage or auth context
        const token = localStorage.getItem('access_token');
        const userId = localStorage.getItem('user_id');

        if (!token || !userId) {
            console.error('No token or userId found');
            return;
        }

        setCurrentUserId(userId);

        // Connect to WebSocket
        socketClient.connect('http://localhost:3003', token);

        // Monitor connection status
        const checkConnection = setInterval(() => {
            setIsConnected(socketClient.isConnected());
        }, 1000);

        return () => {
            clearInterval(checkConnection);
            socketClient.disconnect();
        };
    }, []);

    return (
        <div className="app">
            <header>
                <h1>Chat Application</h1>
                <div className="connection-status">
                    {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
                </div>
            </header>

            {chatId && currentUserId ? (
                <ChatRoom chatId={chatId} currentUserId={currentUserId}/>
            ) : (
                <div className="select-chat">
                    <p>Select a chat to start messaging</p>
                    {/* Chat list component here */}
                </div>
            )}
        </div>
    );
}

export default App;
```

## 🔐 Authentication Flow

```typescript
// When user logs in
async function login(email: string, password: string) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
    });

    const data = await response.json();
    const {access_token, user} = data;

    // Save token and user info
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user_id', user.id);

    // Connect to WebSocket
    socketClient.connect('http://localhost:3003', access_token);
}

// When user logs out
function logout() {
    // Disconnect WebSocket
    socketClient.disconnect();

    // Clear storage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_id');
}
```

## 📊 Event Reference

### Client → Server

| Event                   | Payload                               | Description      |
|-------------------------|---------------------------------------|------------------|
| `chat:join`             | `{chatId: string}`                    | Join chat room   |
| `chat:leave`            | `{chatId: string}`                    | Leave chat room  |
| `chat:send_message`     | `{chatId: string, content: string}`   | Send message     |
| `chat:typing`           | `{chatId: string, isTyping: boolean}` | Typing indicator |
| `chat:mark_read`        | `{chatId: string, messageId: string}` | Mark as read     |
| `chat:get_online_users` | `{chatId: string}`                    | Get online count |

### Server → Client

| Event               | Payload                                               | Description          |
|---------------------|-------------------------------------------------------|----------------------|
| `chat:joined`       | `{chatId: string, timestamp: string}`                 | Join confirmed       |
| `chat:left`         | `{chatId: string, timestamp: string}`                 | Leave confirmed      |
| `chat:new_message`  | `Message`                                             | New message received |
| `chat:user_typing`  | `{chatId: string, userId: string, isTyping: boolean}` | User typing          |
| `chat:user_joined`  | `{chatId: string, userId: string}`                    | User joined room     |
| `chat:user_left`    | `{chatId: string, userId: string}`                    | User left room       |
| `chat:online_users` | `{chatId: string, count: number}`                     | Online users count   |
| `error`             | `{event: string, message: string}`                    | Error occurred       |

## 🎯 Best Practices

1. **Always handle disconnection gracefully**
2. **Show connection status to user**
3. **Implement reconnection logic**
4. **Clear listeners on unmount**
5. **Validate data before emitting**
6. **Use TypeScript for type safety**
7. **Handle errors from server**
8. **Implement rate limiting on client side**

