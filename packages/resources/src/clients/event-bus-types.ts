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
