/**
 * Event Bus Client - Redis Streams Event Publishing & Subscription
 * Provides pub/sub messaging for system events
 */
import type Redis from 'ioredis';
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
export declare class EventBusClient {
    private redis;
    private streamPrefix;
    private running;
    constructor(redis: Redis, streamPrefix?: string);
    /**
     * Publish an event to a stream
     * @param eventType - Type of event (e.g., 'llm.call.created')
     * @param payload - Event payload data
     * @returns Stream message ID
     */
    publish(eventType: string, payload: Record<string, unknown>): Promise<string>;
    /**
     * Subscribe to events with consumer group
     * @param eventType - Type of event to subscribe to
     * @param options - Subscription configuration
     * @param handler - Callback function to handle messages
     */
    subscribe(eventType: string, options: SubscribeOptions, handler: EventHandler): Promise<void>;
    /**
     * Stop a specific subscription
     * @param eventType - Event type
     * @param groupName - Consumer group name
     * @param consumerName - Consumer name
     */
    stopSubscription(eventType: string, groupName: string, consumerName: string): void;
    /**
     * Stop all subscriptions
     */
    stopAll(): void;
}
/**
 * Singleton event bus client instance
 * Uses shared Redis connection from cache client
 */
export declare const eventBusClient: EventBusClient;
//# sourceMappingURL=event-bus.client.d.ts.map