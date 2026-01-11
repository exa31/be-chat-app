# RabbitMQ Library Documentation

Dokumentasi lengkap untuk RabbitMQ message queue library yang robust dan type-safe.

## 📦 Overview

RabbitMQ library menyediakan:

- Connection management dengan automatic retry
- Topic-based message exchange
- Queue management
- Message acknowledgment (ACK/NACK)
- Prefetch handling untuk load balancing
- Error handling & recovery
- Type-safe message payload

## 🔧 Initialization

### Basic Setup

```typescript
// src/index.ts
import * as rabbit from './lib/rabbitmq';

async function start() {
    try {
        await rabbit.connect(process.env.RABBITMQ_URL || 'amqp://localhost', {
            retries: 5,
            initialDelayMs: 200,
            factor: 2,
            useConfirmChannel: true,
        });

        console.log('RabbitMQ connected');
    } catch (err) {
        console.error('Failed to connect:', err);
        process.exit(1);
    }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
    await rabbit.close();
    process.exit(0);
});
```

### With Custom Retry Options

```typescript
await rabbit.connect('amqp://user:pass@rabbitmq.example.com', {
    retries: 10,
    initialDelayMs: 500,
    factor: 1.5,
    useConfirmChannel: true,
});
```

## ⚙️ Configuration

### RabbitMQConfig Type

```typescript
type RabbitMQConfig = {
    retries?: number;              // Retry attempts (default: 5)
    initialDelayMs?: number;       // Initial retry delay (default: 200ms)
    factor?: number;               // Exponential backoff factor (default: 2)
    useConfirmChannel?: boolean;   // Use confirm channel (default: false)
};
```

### Confirm Channel

**Regular Channel**

```typescript
await rabbit.connect(url, {useConfirmChannel: false});
// Faster but no guarantee message reached queue
```

**Confirm Channel**

```typescript
await rabbit.connect(url, {useConfirmChannel: true});
// Slower but guaranteed message reached queue
// Use untuk critical messages
```

### Environment Variables

```env
RABBITMQ_URL=amqp://localhost

# Or specific components
RABBITMQ_HOST=localhost
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
```

## 🚀 Usage

### Publishing Messages

#### Basic Publish to Exchange

```typescript
import * as rabbit from './lib/rabbitmq';

interface EmailJob {
    to: string;
    subject: string;
    body: string;
}

const emailJob: EmailJob = {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Welcome to our service',
};

// Publish to exchange
const success = await rabbit.publish(
    'notifications',      // exchange
    'email.welcome',      // routing key
    emailJob             // payload
);

if (success) {
    console.log('Message published');
} else {
    console.log('Message queued (but may not reach queue yet if using confirm channel)');
}
```

#### Publish with Options

```typescript
await rabbit.publish(
    'notifications',
    'email.welcome',
    emailJob,
    {
        priority: 10,           // Higher priority
        expiration: '60000',    // Expires in 60 seconds
        headers: {
            'x-retry-count': 0,
        },
    }
);
```

---

### Consuming Messages

#### Basic Consumer

```typescript
interface EmailJob {
    to: string;
    subject: string;
    body: string;
}

await rabbit.consume(
    'email-queue',                           // queue name
    async (job: EmailJob) => {
        console.log(`Sending email to ${job.to}`);
        await sendEmail(job);
    },
    {
        durable: true,      // Queue survives broker restart
        prefetch: 1,        // Process one message at a time
        noAck: false,       // Wait for manual ACK
    }
);
```

#### Type-Safe Consumer

```typescript
interface EmailJob {
    to: string;
    subject: string;
    body: string;
}

await rabbit.consume<EmailJob>(
    'email-queue',
    async (job) => {
        // job is typed as EmailJob
        console.log(`Email to: ${job.to}`);
    }
);
```

#### Multiple Parallel Consumers

```typescript
// Process 10 messages in parallel
await rabbit.consume<EmailJob>(
    'email-queue',
    async (job) => {
        await sendEmail(job);
    },
    {prefetch: 10}
);
```

#### Error Handling in Consumer

```typescript
await rabbit.consume<EmailJob>(
    'email-queue',
    async (job) => {
        try {
            await sendEmail(job);
        } catch (err) {
            // If you throw, message is NACK'd
            // (requeued back to queue if durable)
            throw err;
        }
    }
);
```

---

### Queue & Exchange Setup

#### Assert Queue

Memastikan queue ada (create jika tidak):

```typescript
await rabbit.assertQueue('email-queue', {
    durable: true,              // Survive broker restart
    exclusive: false,           // Multiple consumers
    autoDelete: false,          // Don't delete when empty
    maxLength: 1000,           // Max messages in queue
    messageTtl: 3600000,       // Message TTL (1 hour)
});
```

#### Assert Exchange

Memastikan exchange ada:

```typescript
await rabbit.assertExchange(
    'notifications',        // exchange name
    'topic',               // type: direct, topic, fanout, headers
    {
        durable: true,     // Survive broker restart
        autoDelete: false, // Don't delete when empty
    }
);
```

#### Bind Queue to Exchange

Menghubungkan queue ke exchange dengan pattern:

```typescript
// Topic exchange: pattern matching
await rabbit.bindQueue(
    'email-queue',          // queue
    'notifications',        // exchange
    'email.*'              // pattern (email.welcome, email.alert, etc)
);

// Fanout exchange: all messages
await rabbit.bindQueue(
    'broadcast-queue',
    'announcements',
    '*'
);

// Direct exchange: exact match
await rabbit.bindQueue(
    'specific-queue',
    'commands',
    'user.created'
);
```

---

## 📋 API Reference

### connect()

Connect ke RabbitMQ server.

```typescript
export async function connect(
    url: string,
    config?: RabbitMQConfig
): Promise<void>
```

**Parameters:**

- `url`: RabbitMQ connection URL (e.g., `amqp://localhost`)
- `config`: Connection options

**Throws:**

- Error jika tidak bisa connect setelah retries

**Example:**

```typescript
await rabbit.connect('amqp://localhost', {
    retries: 5,
    useConfirmChannel: true,
});
```

---

### publish<T>()

Publish message ke exchange.

```typescript
export async function publish<T = unknown>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: Options.Publish
): Promise<boolean>
```

**Parameters:**

- `exchange`: Exchange name
- `routingKey`: Routing key untuk pattern matching
- `payload`: Message payload (akan di-JSON stringify)
- `options`: Publishing options

**Returns:**

- true jika message diterima (confirm channel)
- true/false jika non-confirm channel

**Example:**

```typescript
interface Task {
    id: string;
    type: string;
    data: any;
}

const task: Task = {
    id: 'task-123',
    type: 'process_image',
    data: {url: 'https://...'},
};

await rabbit.publish('tasks', 'process.image', task);
```

---

### consume<T>()

Consume messages dari queue.

```typescript
export async function consume<T = unknown>(
    queue: string,
    handler: (msg: T) => Promise<void> | void,
    options?: {
        durable?: boolean;
        prefetch?: number;
        noAck?: boolean;
    }
): Promise<void>
```

**Parameters:**

- `queue`: Queue name
- `handler`: Async function to process message
- `options`: Consumer options

**Options:**

- `durable`: Queue survives broker restart (default: true)
- `prefetch`: Max messages to process in parallel (default: 1)
- `noAck`: Auto-ACK without waiting handler (default: false)

**Throws:**

- Error jika handler throws → message NACK'd
- Error jika queue not exist

**Example:**

```typescript
await rabbit.consume<EmailJob>(
    'email-queue',
    async (job) => {
        await sendEmail(job);
        // Automatically ACK'd on success
    },
    {prefetch: 5}
);
```

---

### assertQueue()

Create queue jika belum ada.

```typescript
export async function assertQueue(
    queue: string,
    options?: Options.AssertQueue
): Promise<void>
```

**Example:**

```typescript
await rabbit.assertQueue('email-queue', {
    durable: true,
    maxLength: 10000,
    messageTtl: 3600000,
});
```

---

### assertExchange()

Create exchange jika belum ada.

```typescript
export async function assertExchange(
    exchange: string,
    type?: 'direct' | 'topic' | 'fanout' | 'headers',
    options?: Options.AssertExchange
): Promise<void>
```

**Parameters:**

- `exchange`: Exchange name
- `type`: Exchange type (default: 'topic')
- `options`: Exchange options

**Exchange Types:**

- `direct` - Exact routing key match
- `topic` - Pattern matching (*.*, #.*)
- `fanout` - All bound queues receive
- `headers` - Match headers instead of routing key

**Example:**

```typescript
// Topic exchange for flexible routing
await rabbit.assertExchange('notifications', 'topic', {
    durable: true,
});

// Fanout exchange untuk broadcast
await rabbit.assertExchange('announcements', 'fanout');

// Direct exchange untuk exact match
await rabbit.assertExchange('commands', 'direct');
```

---

### bindQueue()

Bind queue ke exchange dengan pattern.

```typescript
export async function bindQueue(
    queue: string,
    exchange: string,
    pattern: string
): Promise<void>
```

**Parameters:**

- `queue`: Queue name
- `exchange`: Exchange name
- `pattern`: Routing pattern (depends on exchange type)

**Pattern Examples (Topic Exchange):**

- `email.*` - Match email.welcome, email.alert
- `user.#` - Match user.created, user.updated.profile
- `#` - Match all messages

**Example:**

```typescript
// Queue receives all email notifications
await rabbit.bindQueue('email-queue', 'notifications', 'email.*');

// Queue receives user events
await rabbit.bindQueue('user-queue', 'events', 'user.#');
```

---

### getChannel()

Get RabbitMQ channel instance.

```typescript
export function getChannel(): Channel | null
```

**Returns:**

- Channel instance atau null jika not connected

**Use Case:**

- Advanced operations tidak di-expose oleh library

**Example:**

```typescript
const channel = rabbit.getChannel();
if (channel) {
    // Direct amqplib operations
    await channel.deleteQueue('old-queue');
}
```

---

### getConnection()

Get RabbitMQ connection instance.

```typescript
export function getConnection(): AmqpConnection | null
```

---

### isConnected()

Check if RabbitMQ is connected.

```typescript
export function isConnected(): boolean
```

**Example:**

```typescript
if (!rabbit.isConnected()) {
    console.error('Not connected to RabbitMQ');
    process.exit(1);
}
```

---

### close()

Close RabbitMQ connection gracefully.

```typescript
export async function close(): Promise<void>
```

**Example:**

```typescript
process.on('SIGINT', async () => {
    await rabbit.close();
    process.exit(0);
});
```

---

## 💡 Patterns & Best Practices

### 1. Complete Setup Example

```typescript
// src/lib/messageQueue.ts
import * as rabbit from './rabbitmq';

export interface EmailJob {
    to: string;
    subject: string;
    template: string;
}

export async function initMessageQueue() {
    // Connect
    await rabbit.connect(process.env.RABBITMQ_URL!, {
        retries: 5,
        useConfirmChannel: true,
    });

    // Setup exchange
    await rabbit.assertExchange('notifications', 'topic', {
        durable: true,
    });

    // Setup queues
    await rabbit.assertQueue('email-queue', {
        durable: true,
        maxLength: 100000,
    });

    // Bind queue
    await rabbit.bindQueue('email-queue', 'notifications', 'email.*');

    // Start consumer
    await rabbit.consume<EmailJob>(
        'email-queue',
        async (job) => {
            await sendEmail(job);
        },
        {prefetch: 10}
    );
}

export async function sendEmailJob(job: EmailJob) {
    await rabbit.publish('notifications', 'email.send', job);
}

// src/index.ts
import {initMessageQueue, sendEmailJob} from './lib/messageQueue';

await initMessageQueue();

// Send email from anywhere
await sendEmailJob({
    to: 'user@example.com',
    subject: 'Welcome',
    template: 'welcome',
});
```

### 2. Multiple Exchanges & Queues

```typescript
// Setup different queues untuk different jobs
await rabbit.assertExchange('jobs', 'topic');

const queues = [
    {name: 'email-queue', pattern: 'job.email.*'},
    {name: 'image-queue', pattern: 'job.image.*'},
    {name: 'notification-queue', pattern: 'job.notification.*'},
];

for (const q of queues) {
    await rabbit.assertQueue(q.name, {durable: true});
    await rabbit.bindQueue(q.name, 'jobs', q.pattern);
}

// Consumers
await rabbit.consume('email-queue', handleEmail);
await rabbit.consume('image-queue', handleImage);
await rabbit.consume('notification-queue', handleNotification);

// Publishing
await rabbit.publish('jobs', 'job.email.send', { /* ... */});
await rabbit.publish('jobs', 'job.image.resize', { /* ... */});
```

### 3. Retry Logic

```typescript
interface Task {
    id: string;
    action: string;
    retries: number;
    maxRetries: number;
}

await rabbit.consume<Task>(
    'task-queue',
    async (task) => {
        try {
            await processTask(task);
        } catch (err) {
            if (task.retries < task.maxRetries) {
                // Requeue dengan delay
                const delayMs = Math.pow(2, task.retries) * 1000;
                setTimeout(() => {
                    rabbit.publish('jobs', 'task.retry', {
                        ...task,
                        retries: task.retries + 1,
                    });
                }, delayMs);
            } else {
                // Move to dead letter queue
                rabbit.publish('dlq', 'failed.task', task);
            }
        }
    }
);
```

### 4. Scheduled Jobs dengan RabbitMQ

```typescript
// Setiap hari pukul 2 AM
schedule('0 2 * * *', async () => {
    await rabbit.publish('scheduled-jobs', 'job.daily-report', {
        type: 'daily-report',
        timestamp: Date.now(),
    });
});

// Consumer
await rabbit.consume('scheduled-jobs-queue', async (job) => {
    await generateDailyReport();
});
```

### 5. Fan-Out (Broadcast)

```typescript
// Setup
await rabbit.assertExchange('announcements', 'fanout');
await rabbit.assertQueue('queue-1');
await rabbit.assertQueue('queue-2');

// Bind multiple queues
await rabbit.bindQueue('queue-1', 'announcements', '');
await rabbit.bindQueue('queue-2', 'announcements', '');

// Broadcast ke semua queue
await rabbit.publish('announcements', '', {
    message: 'Server maintenance in 5 minutes',
});

// Consumers
await rabbit.consume('queue-1', async (msg) => {
    console.log('Queue 1:', msg);
});

await rabbit.consume('queue-2', async (msg) => {
    console.log('Queue 2:', msg);
});
```

---

## 🎯 Use Cases

### 1. Email Sending

```typescript
interface EmailJob {
    to: string;
    subject: string;
    template: string;
}

// When user registers
await rabbit.publish('notifications', 'email.welcome', {
    to: user.email,
    subject: 'Welcome!',
    template: 'welcome',
});

// Consumer
await rabbit.consume<EmailJob>('email-queue', async (job) => {
    await sendEmail(job);
});
```

### 2. Image Processing

```typescript
interface ImageJob {
    imageUrl: string;
    sizes: ('thumbnail' | 'medium' | 'large')[];
}

// Queue image resize job
await rabbit.publish('jobs', 'job.image.process', {
    imageUrl: 'https://...',
    sizes: ['thumbnail', 'medium'],
});

// Consumer
await rabbit.consume<ImageJob>('image-queue', async (job) => {
    for (const size of job.sizes) {
        await resizeImage(job.imageUrl, size);
    }
});
```

### 3. Notification System

```typescript
interface NotificationJob {
    userId: string;
    type: 'email' | 'sms' | 'push';
    message: string;
}

// Publish notification
await rabbit.publish('notifications', `notification.${user.preferredMethod}`, {
    userId: user.id,
    type: user.preferredMethod,
    message: 'You have a new message',
});

// Route to appropriate handler
await rabbit.consume('email-notifications', handleEmailNotification);
await rabbit.consume('sms-notifications', handleSmsNotification);
await rabbit.consume('push-notifications', handlePushNotification);
```

### 4. Analytics/Logging

```typescript
interface AnalyticsEvent {
    event: string;
    userId: string;
    timestamp: number;
    data: any;
}

// Send event
await rabbit.publish('analytics', 'event.page_view', {
    event: 'page_view',
    userId: 'user-123',
    timestamp: Date.now(),
    data: { page: '/dashboard' },
});

// Batch consumer (process in groups)
await rabbit.consume<AnalyticsEvent>(
    'analytics-queue',
    async (event) => {
        // Store in database
        await saveAnalyticsEvent(event);
    },
    { prefetch: 100 }
);
```

---

## ⚡ Performance Tips

### 1. Prefetch Count

```typescript
// For CPU-heavy tasks: lower prefetch
await rabbit.consume(queue, handler, {prefetch: 1});

// For I/O tasks: higher prefetch
await rabbit.consume(queue, handler, {prefetch: 20});
```

### 2. Message Persistence

```typescript
// Default: messages persisted
await rabbit.publish(exchange, key, payload); // Persisted

// Non-persistent (faster but lost on restart)
await rabbit.publish(exchange, key, payload, {
    persistent: false,
});
```

### 3. Queue Configuration

```typescript
// For high throughput
await rabbit.assertQueue(queue, {
    durable: true,
    maxLength: 1000000,        // Large queue
    maxLengthBytes: 1073741824, // 1GB limit
});

// For low latency
await rabbit.assertQueue(queue, {
    durable: true,
    maxLength: 1000,           // Small queue
    messageTtl: 60000,         // 1 min TTL
});
```

### 4. Connection Pooling

RabbitMQ library uses single connection. Untuk high throughput:

```typescript
// Create multiple channels
const channel1 = rabbit.getChannel();
const channel2 = rabbit.getChannel();
// Same channel instance (pooled internally by amqplib)
```

---

## 🧪 Testing

### Mock RabbitMQ

```typescript
jest.mock('../lib/rabbitmq', () => ({
    connect: jest.fn(),
    publish: jest.fn(),
    consume: jest.fn(),
    close: jest.fn(),
}));

import * as rabbit from '../lib/rabbitmq';

describe('Message Queue', () => {
    it('should publish message', async () => {
        (rabbit.publish as jest.Mock).mockResolvedValue(true);

        const result = await rabbit.publish('exchange', 'key', {test: true});
        expect(result).toBe(true);
    });
});
```

---

## ❌ Common Errors & Fixes

### Error: "not connected"

**Cause**: `connect()` belum dipanggil

**Fix**:

```typescript
await rabbit.connect(process.env.RABBITMQ_URL);
```

---

### Error: "ECONNREFUSED"

**Cause**: RabbitMQ server tidak running

**Fix**:

```bash
# Start RabbitMQ
docker run -d -p 5672:5672 -p 15672:15672 rabbitmq:management
```

---

### Error: "Queue already exists with different parameters"

**Cause**: Queue exists dengan config berbeda

**Fix**:

```bash
# Delete queue manually
rabbitmqctl delete_queue queue_name

# Or change queue name
```

---

### Message Not Delivered

**Cause**: Queue/exchange tidak bound

**Fix**:

```typescript
// Ensure binding exists
await rabbit.bindQueue('queue', 'exchange', 'pattern');
```

---

## 📚 References

- [RabbitMQ Official](https://www.rabbitmq.com/)
- [amqplib Documentation](https://github.com/amqp-node/amqplib)
- [RabbitMQ Tutorials](https://www.rabbitmq.com/getstarted.html)
- [Message Queue Patterns](https://www.rabbitmq.com/getstarted.html#rabbitmq-is-flexible)

