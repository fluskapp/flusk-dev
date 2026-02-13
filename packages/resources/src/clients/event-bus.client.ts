/**
 * Event Bus Client - Redis Streams Event Publishing & Subscription
 * Provides pub/sub messaging for system events
 */

import type Redis from 'ioredis';
import { getLogger } from '@flusk/logger';
import { getConnection } from '../cache/redis.client.js';

const logger = getLogger().child({ module: 'event-bus' });

export interface EventMessage {
  eventType: string;
  payload: Record<string, unknown>;
  timestamp?: number;
}

export interface SubscribeOptions {
  groupName: string;
  consumerName: string;
  blockMs?: number;
  count?: number;
}

export type EventHandler = (message: EventMessage) => Promise<void>;

/**
 * EventBusClient - Publishes and subscribes to system events via Redis Streams
 */
export class EventBusClient {
  private redis: Redis;
  private streamPrefix: string;
  private running: Map<string, boolean>;

  constructor(redis: Redis, streamPrefix: string = 'flusk:events') {
    this.redis = redis;
    this.streamPrefix = streamPrefix;
    this.running = new Map();
  }

  /**
   * Publish an event to a stream
   * @param eventType - Type of event (e.g., 'llm.call.created')
   * @param payload - Event payload data
   * @returns Stream message ID
   */
  async publish(
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<string> {
    const streamKey = `${this.streamPrefix}:${eventType}`;
    const timestamp = Date.now();

    // Redis Streams XADD - add message to stream
    const messageId = await this.redis.xadd(
      streamKey,
      '*', // Auto-generate ID
      'eventType',
      eventType,
      'payload',
      JSON.stringify(payload),
      'timestamp',
      timestamp.toString()
    );

    return messageId || 'unknown';
  }

  /**
   * Subscribe to events with consumer group
   * @param eventType - Type of event to subscribe to
   * @param options - Subscription configuration
   * @param handler - Callback function to handle messages
   */
  async subscribe(
    eventType: string,
    options: SubscribeOptions,
    handler: EventHandler
  ): Promise<void> {
    const streamKey = `${this.streamPrefix}:${eventType}`;
    const { groupName, consumerName, blockMs = 5000, count = 10 } = options;

    // Ensure consumer group exists
    try {
      await this.redis.xgroup(
        'CREATE',
        streamKey,
        groupName,
        '0', // Start from beginning
        'MKSTREAM' // Create stream if it doesn't exist
      );
    } catch (err: unknown) {
      // Group might already exist - ignore BUSYGROUP error
      if (
        err &&
        typeof err === 'object' &&
        'message' in err &&
        !(err as { message: string }).message.includes('BUSYGROUP')
      ) {
        throw err;
      }
    }

    // Mark this subscription as running
    const subscriptionKey = `${eventType}:${groupName}:${consumerName}`;
    this.running.set(subscriptionKey, true);

    // Start consuming messages in a loop
    while (this.running.get(subscriptionKey)) {
      try {
        // Redis Streams XREADGROUP - read messages for consumer group
        // Using call() to properly handle the variable arguments
        const results = (await this.redis.call(
          'XREADGROUP',
          'GROUP',
          groupName,
          consumerName,
          'BLOCK',
          blockMs.toString(),
          'COUNT',
          count.toString(),
          'STREAMS',
          streamKey,
          '>' // Only new messages
        )) as Array<[string, Array<[string, string[]]>]> | null;

        if (!results || results.length === 0) {
          continue; // Timeout, no messages
        }

        // Process each message
        for (const [, messages] of results) {
          for (const [messageId, fields] of messages) {
            try {
              // Parse message fields
              const eventMessage: EventMessage = {
                eventType: '',
                payload: {},
                timestamp: 0,
              };

              for (let i = 0; i < fields.length; i += 2) {
                const key = fields[i];
                const value = fields[i + 1];

                if (key === 'eventType') {
                  eventMessage.eventType = value;
                } else if (key === 'payload') {
                  eventMessage.payload = JSON.parse(value);
                } else if (key === 'timestamp') {
                  eventMessage.timestamp = parseInt(value, 10);
                }
              }

              // Call handler
              await handler(eventMessage);

              // Acknowledge message
              await this.redis.xack(streamKey, groupName, messageId);
            } catch (handlerError) {
              logger.error(
                { messageId, err: handlerError },
                'error handling message',
              );
              // Message will be retried by another consumer
            }
          }
        }
      } catch (err) {
        logger.error({ err }, 'error reading from stream');
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Stop a specific subscription
   * @param eventType - Event type
   * @param groupName - Consumer group name
   * @param consumerName - Consumer name
   */
  stopSubscription(
    eventType: string,
    groupName: string,
    consumerName: string
  ): void {
    const subscriptionKey = `${eventType}:${groupName}:${consumerName}`;
    this.running.set(subscriptionKey, false);
  }

  /**
   * Stop all subscriptions
   */
  stopAll(): void {
    this.running.forEach((_, key) => {
      this.running.set(key, false);
    });
  }
}

/**
 * Singleton event bus client instance
 * Uses shared Redis connection from cache client
 */
export const eventBusClient = new EventBusClient(getConnection());
