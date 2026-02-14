/**
 * Event Bus Client - Redis Streams Event Publishing & Subscription
 */
import type Redis from 'ioredis';
import { getConnection } from '../cache/redis.client.js';
import { consumeStream } from './event-bus-subscriber.js';
import type { SubscribeOptions, EventHandler } from './event-bus-types.js';
export type { EventMessage, SubscribeOptions, EventHandler } from './event-bus-types.js';

/** EventBusClient - Publishes and subscribes via Redis Streams */
export class EventBusClient {
  private redis: Redis;
  private streamPrefix: string;
  private running: Map<string, boolean>;

  constructor(redis: Redis, streamPrefix: string = 'flusk:events') {
    this.redis = redis;
    this.streamPrefix = streamPrefix;
    this.running = new Map();
  }

  /** Publish an event to a stream */
  async publish(eventType: string, payload: Record<string, unknown>): Promise<string> {
    const streamKey = `${this.streamPrefix}:${eventType}`;
    const messageId = await this.redis.xadd(
      streamKey, '*',
      'eventType', eventType,
      'payload', JSON.stringify(payload),
      'timestamp', Date.now().toString()
    );
    return messageId || 'unknown';
  }

  /** Subscribe to events with consumer group */
  async subscribe(eventType: string, options: SubscribeOptions, handler: EventHandler): Promise<void> {
    const streamKey = `${this.streamPrefix}:${eventType}`;
    const subscriptionKey = `${eventType}:${options.groupName}:${options.consumerName}`;
    await consumeStream(this.redis, streamKey, options, handler, this.running, subscriptionKey);
  }

  /** Stop a specific subscription */
  stopSubscription(eventType: string, groupName: string, consumerName: string): void {
    this.running.set(`${eventType}:${groupName}:${consumerName}`, false);
  }

  /** Stop all subscriptions */
  stopAll(): void {
    this.running.forEach((_, key) => { this.running.set(key, false); });
  }
}

/** Singleton event bus client instance */
export const eventBusClient = new EventBusClient(getConnection());
