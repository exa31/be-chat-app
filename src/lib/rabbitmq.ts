import amqplib, {Channel, ConsumeMessage, Options} from 'amqplib';

type AmqpConnection = Awaited<ReturnType<typeof amqplib.connect>>;

let connection: AmqpConnection | null = null;
let channel: Channel | null = null;

export type RabbitMQConfig = {
    retries?: number;
    initialDelayMs?: number;
    factor?: number;
    useConfirmChannel?: boolean;
};

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connect(url: string, config: RabbitMQConfig = {}): Promise<void> {
    if (connection && channel) {
        // eslint-disable-next-line no-console
        console.info('[rabbitmq] already connected');
        return;
    }

    const retries = config.retries ?? 5;
    const initialDelayMs = config.initialDelayMs ?? 200;
    const factor = config.factor ?? 2;
    const useConfirmChannel = config.useConfirmChannel ?? false;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < retries) {
        try {
            const conn = await amqplib.connect(url);
            connection = conn;

            conn.on('error', (err: Error) => {
                // eslint-disable-next-line no-console
                console.error('[rabbitmq] connection error:', err.message);
                connection = null;
                channel = null;
            });

            conn.on('close', () => {
                // eslint-disable-next-line no-console
                console.warn('[rabbitmq] connection closed');
                connection = null;
                channel = null;
            });

            if (useConfirmChannel) {
                channel = await conn.createConfirmChannel();
            } else {
                channel = await conn.createChannel();
            }

            // eslint-disable-next-line no-console
            console.info('[rabbitmq] connected successfully');
            return;
        } catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            attempt += 1;
            const waitMs = initialDelayMs * Math.pow(factor, attempt - 1);
            // eslint-disable-next-line no-console
            console.warn(`[rabbitmq] connect attempt ${attempt}/${retries} failed: ${lastError.message}. Retrying in ${waitMs}ms...`);
            await delay(waitMs);
        }
    }

    throw new Error(`[rabbitmq] failed to connect after ${retries} attempts. Last error: ${lastError?.message}`);
}

export async function publish<T = unknown>(
    exchange: string,
    routingKey: string,
    payload: T,
    options?: Options.Publish
): Promise<boolean> {
    if (!channel) {
        throw new Error('[rabbitmq] not connected. Call connect() first.');
    }

    const buffer = Buffer.from(JSON.stringify(payload));
    await channel.assertExchange(exchange, 'topic', {durable: true});

    return channel.publish(exchange, routingKey, buffer, {
        persistent: true,
        contentType: 'application/json',
        ...options,
    });
}

export async function consume<T = unknown>(
    queue: string,
    handler: (msg: T) => Promise<void> | void,
    options?: {
        durable?: boolean;
        prefetch?: number;
        noAck?: boolean;
    }
): Promise<void> {
    if (!channel) {
        throw new Error('[rabbitmq] not connected. Call connect() first.');
    }

    const durable = options?.durable ?? true;
    const prefetch = options?.prefetch ?? 1;
    const noAck = options?.noAck ?? false;

    await channel.assertQueue(queue, {durable});

    if (prefetch > 0) {
        channel.prefetch(prefetch);
    }

    await channel.consume(
        queue,
        async (msg: ConsumeMessage | null) => {
            if (!msg) {
                // eslint-disable-next-line no-console
                console.warn('[rabbitmq] received null message');
                return;
            }

            try {
                const content = JSON.parse(msg.content.toString()) as T;
                await Promise.resolve(handler(content));

                if (!noAck && channel) {
                    channel.ack(msg);
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                // eslint-disable-next-line no-console
                console.error('[rabbitmq] handler error:', error.message);

                if (!noAck && channel) {
                    try {
                        channel.nack(msg, false, false);
                    } catch (nackErr) {
                        // eslint-disable-next-line no-console
                        console.error('[rabbitmq] failed to nack message:', nackErr);
                    }
                }
            }
        },
        {noAck}
    );
}

export async function assertQueue(
    queue: string,
    options?: Options.AssertQueue
): Promise<void> {
    if (!channel) {
        throw new Error('[rabbitmq] not connected. Call connect() first.');
    }

    await channel.assertQueue(queue, {durable: true, ...options});
}

export async function assertExchange(
    exchange: string,
    type: 'direct' | 'topic' | 'fanout' | 'headers' = 'topic',
    options?: Options.AssertExchange
): Promise<void> {
    if (!channel) {
        throw new Error('[rabbitmq] not connected. Call connect() first.');
    }

    await channel.assertExchange(exchange, type, {durable: true, ...options});
}

export async function bindQueue(
    queue: string,
    exchange: string,
    pattern: string
): Promise<void> {
    if (!channel) {
        throw new Error('[rabbitmq] not connected. Call connect() first.');
    }

    await channel.bindQueue(queue, exchange, pattern);
}

export function getChannel(): Channel | null {
    return channel;
}

export function getConnection(): AmqpConnection | null {
    return connection;
}

export function isConnected(): boolean {
    return connection !== null && channel !== null;
}

export async function close(): Promise<void> {
    if (channel) {
        try {
            await channel.close();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[rabbitmq] error closing channel:', err);
        }
        channel = null;
    }

    if (connection) {
        try {
            await connection.close();
        } catch (err) {
            // eslint-disable-next-line no-console
            console.error('[rabbitmq] error closing connection:', err);
        }
        connection = null;
    }

    // eslint-disable-next-line no-console
    console.info('[rabbitmq] disconnected');
}
