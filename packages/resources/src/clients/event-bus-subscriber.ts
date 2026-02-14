import type Redis from 'ioredis';
import { getLogger } from '@flusk/logger';
import type { EventMessage, SubscribeOptions, EventHandler } from './event-bus-types.js';

const logger = getLogger().child({ module: 'event-bus' });

/** Process messages from a Redis Stream consumer group */
export async function consumeStream(
  redis: Redis,
  streamKey: string,
  options: SubscribeOptions,
  handler: EventHandler,
  running: Map<string, boolean>,
  subscriptionKey: string,
): Promise<void> {
  const { groupName, consumerName, blockMs = 5000, count = 10 } = options;

  try {
    await redis.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
  } catch (err: unknown) {
    if (
      err && typeof err === 'object' && 'message' in err &&
      !(err as { message: string }).message.includes('BUSYGROUP')
    ) {
      throw err;
    }
  }

  running.set(subscriptionKey, true);

  while (running.get(subscriptionKey)) {
    try {
      const results = (await redis.call(
        'XREADGROUP', 'GROUP', groupName, consumerName,
        'BLOCK', blockMs.toString(), 'COUNT', count.toString(),
        'STREAMS', streamKey, '>'
      )) as Array<[string, Array<[string, string[]]>]> | null;

      if (!results || results.length === 0) continue;

      for (const [, messages] of results) {
        for (const [messageId, fields] of messages) {
          try {
            const eventMessage = parseFields(fields);
            await handler(eventMessage);
            await redis.xack(streamKey, groupName, messageId);
          } catch (handlerError) {
            logger.error({ messageId, err: handlerError }, 'error handling message');
          }
        }
      }
    } catch (err) {
      logger.error({ err }, 'error reading from stream');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

function parseFields(fields: string[]): EventMessage {
  const msg: EventMessage = { eventType: '', payload: {}, timestamp: 0 };
  for (let i = 0; i < fields.length; i += 2) {
    const key = fields[i];
    const value = fields[i + 1];
    if (key === 'eventType') msg.eventType = value;
    else if (key === 'payload') msg.payload = JSON.parse(value);
    else if (key === 'timestamp') msg.timestamp = parseInt(value, 10);
  }
  return msg;
}
