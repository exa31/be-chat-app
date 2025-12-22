# RabbitMQ Library Usage Documentation

## Overview

Type-safe RabbitMQ wrapper for Node.js with TypeScript support. Provides simple API for publishing and consuming
messages with automatic retries, error handling, and connection management.

## Features

- ✅ **Fully type-safe** with TypeScript generics
- ✅ **Auto-retry** connection with exponential backoff
- ✅ **Error handling** with automatic NACK on handler failures
- ✅ **Confirm channels** support for guaranteed delivery
- ✅ **Prefetch control** for consumer backpressure
- ✅ **Helper functions** for queue/exchange management

## Installation

```bash
npm install amqplib
npm install --save-dev @types/amqplib
```

## Basic Usage

### 1. Connect to RabbitMQ

```typescript
import * as rabbit from './lib/rabbitmq';

// Simple connection
await rabbit.connect('amqp://localhost');

// Connection with retry config
await rabbit.connect('amqp://user:pass@localhost:5672', {
    retries: 5,
    initialDelayMs: 200,
    factor: 2,
    useConfirmChannel: false
});
```

### 2. Publishing Messages

```typescript
// Basic publish (type-safe with generics)
type UserCreatedEvent = {
    userId: string;
    email: string;
    timestamp: number;
};

await rabbit.publish<UserCreatedEvent>(
    'app.exchange',
    'user.created',
    {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@example.com',
        timestamp: Date.now()
    }
);

// Publish with options
await rabbit.publish(
    'app.exchange',
    'order.placed',
    {orderId: '123', total: 99.99},
    {
        expiration: '60000', // 1 minute TTL
        priority: 5,
        headers: {'x-retry-count': 0}
    }
);
```

### 3. Consuming Messages

```typescript
// Type-safe consumer
type OrderEvent = {
    orderId: string;
    total: number;
};

await rabbit.consume<OrderEvent>(
    'order.processing.queue',
    async (msg) => {
        console.log('Processing order:', msg.orderId);
        // msg is typed as OrderEvent
        await processOrder(msg);
    },
    {
        durable: true,
        prefetch: 10, // process max 10 messages concurrently
        noAck: false  // auto-ack disabled, manual ack on success
    }
);

// Simple consumer with default options
await rabbit.consume('notifications.queue', async (msg) => {
    console.log('Received notification:', msg);
    await sendEmail(msg);
});
```

## Advanced Usage

### Create Queue & Exchange

```typescript
// Create queue
await rabbit.assertQueue('my.queue', {
    durable: true,
    maxLength: 1000,
    messageTtl: 86400000, // 24 hours
    deadLetterExchange: 'dlx.exchange'
});

// Create exchange
await rabbit.assertExchange('app.exchange', 'topic', {
    durable: true,
    autoDelete: false
});

// Bind queue to exchange
await rabbit.bindQueue(
    'order.processing.queue',
    'app.exchange',
    'order.*'
);
```

### Check Connection Status

```typescript
if (rabbit.isConnected()) {
    console.log('RabbitMQ is connected');
}

const channel = rabbit.getChannel();
const connection = rabbit.getConnection();
```

### Graceful Shutdown

```typescript
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    await rabbit.close();
    process.exit(0);
});
```

## Complete Example: User Service

### Publisher (User Registration)

```typescript
// src/modules/user/userService.ts
import * as rabbit from '../../lib/rabbitmq';

export async function registerUser(payload: RegisterInput) {
    const {name, email, password, avatar} = payload;
    const passwordHash = await hashPassword(password);

    return await executeInTransaction(async (client) => {
        const user = await repo.createUserWithClient(client, name, email, passwordHash, avatar ?? null);

        // Publish event after user created
        await rabbit.publish('app.exchange', 'user.created', {
            userId: user.id,
            email: user.email,
            name: user.name,
            timestamp: Date.now()
        });

        const {token: refreshToken, expiresAt} = await tokenService.createRefreshToken(user.id, client);
        const accessToken = tokenService.signAccessToken({sub: user.id, email: user.email});

        return {access_token: accessToken, refresh_token: refreshToken, refresh_expires_at: expiresAt, user};
    });
}
```

### Consumer (Email Service)

```typescript
// src/workers/emailWorker.ts
import * as rabbit from '../lib/rabbitmq';

type UserCreatedEvent = {
    userId: string;
    email: string;
    name: string;
    timestamp: number;
};

async function startEmailWorker() {
    await rabbit.connect(process.env.RABBITMQ_URL ?? 'amqp://localhost');

    // Setup exchange and queue
    await rabbit.assertExchange('app.exchange', 'topic');
    await rabbit.assertQueue('email.welcome.queue', {
        durable: true,
        deadLetterExchange: 'dlx.exchange'
    });
    await rabbit.bindQueue('email.welcome.queue', 'app.exchange', 'user.created');

    // Start consuming
    await rabbit.consume<UserCreatedEvent>(
        'email.welcome.queue',
        async (event) => {
            console.log(`Sending welcome email to ${event.email}`);
            await sendWelcomeEmail(event.email, event.name);
        },
        {
            prefetch: 5 // process 5 emails concurrently
        }
    );

    console.log('Email worker started');
}

startEmailWorker().catch(console.error);
```

## Integration with Express App

```typescript
// src/index.ts
import express from 'express';
import * as rabbit from './lib/rabbitmq';
import {initPostgres, shutdownPostgres} from './databases/postgres';

const app = express();

async function startup() {
    // Initialize Postgres
    await initPostgres();

    // Initialize RabbitMQ
    await rabbit.connect(process.env.RABBITMQ_URL ?? 'amqp://localhost', {
        retries: 10,
        initialDelayMs: 500
    });

    // Start server
    const PORT = process.env.PORT ?? 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

async function shutdown() {
    console.log('Graceful shutdown initiated...');
    await rabbit.close();
    await shutdownPostgres();
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startup().catch(console.error);
```

## Error Handling

The library automatically handles errors:

```typescript
await rabbit.consume('orders.queue', async (msg) => {
    // If this throws an error:
    // 1. Error is logged to console
    // 2. Message is NACK'ed (not requeued)
    // 3. Can be sent to dead letter exchange if configured
    await processOrder(msg);
});
```

## Configuration Options

### RabbitMQConfig

```typescript
type RabbitMQConfig = {
    retries?: number;           // Connection retry attempts (default: 5)
    initialDelayMs?: number;    // Initial retry delay (default: 200ms)
    factor?: number;            // Exponential backoff factor (default: 2)
    useConfirmChannel?: boolean; // Use confirm channel for publisher confirms (default: false)
};
```

### Consume Options

```typescript
{
    durable ? : boolean;    // Queue survives broker restart (default: true)
    prefetch ? : number;    // Max messages to process concurrently (default: 1)
    noAck ? : boolean;      // Auto-acknowledge messages (default: false)
}
```

## Best Practices

1. **Always use type generics** for publish/consume to ensure type safety
2. **Set appropriate prefetch** values based on message processing time
3. **Use dead letter exchanges** for failed message handling
4. **Implement graceful shutdown** to drain messages before exit
5. **Monitor connection status** in production
6. **Use durable queues and exchanges** for persistence
7. **Set message TTL** to prevent queue buildup
8. **Use confirm channels** for critical messages (set `useConfirmChannel: true`)

## Environment Variables

```env
RABBITMQ_URL=amqp://user:password@localhost:5672
# or with vhost
RABBITMQ_URL=amqp://user:password@localhost:5672/my-vhost
```

## API Reference

### connect(url, config?)

Connect to RabbitMQ with retry support.

### publish<T>(exchange, routingKey, payload, options?)

Publish a typed message to an exchange.

### consume<T>(queue, handler, options?)

Consume typed messages from a queue.

### assertQueue(queue, options?)

Create/verify a queue exists.

### assertExchange(exchange, type, options?)

Create/verify an exchange exists.

### bindQueue(queue, exchange, pattern)

Bind a queue to an exchange with routing pattern.

### isConnected()

Check if connected to RabbitMQ.

### getChannel()

Get the current channel instance.

### getConnection()

Get the current connection instance.

### close()

Close channel and connection gracefully.

## Troubleshooting

### Connection keeps dropping

- Check network stability
- Increase retry attempts and delay
- Use heartbeat settings in connection URL: `amqp://localhost?heartbeat=30`

### Messages not being consumed

- Verify queue binding to exchange
- Check routing key matches
- Ensure consumer is running and connected

### Memory issues

- Reduce prefetch count
- Set queue max length
- Implement message TTL
- Use lazy queues for large backlogs

## License

MIT

