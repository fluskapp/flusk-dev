import { EventEmitter } from 'node:events'

export interface CostEvent {
  type: 'call.tracked' | 'cost.update'
  data: {
    id?: string
    provider?: string
    model?: string
    cost?: number
    totalTokens?: number
    timestamp: string
  }
}

/**
 * In-process event bus for real-time cost tracking
 * SSE clients subscribe, LLM call creation emits
 */
class CostEventBus extends EventEmitter {
  emit(event: 'cost', data: CostEvent): boolean
  emit(event: string, ...args: unknown[]): boolean {
    return super.emit(event, ...args)
  }

  on(event: 'cost', listener: (data: CostEvent) => void): this
  on(event: string, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener)
  }

  off(event: 'cost', listener: (data: CostEvent) => void): this
  off(event: string, listener: (...args: unknown[]) => void): this {
    return super.off(event, listener)
  }
}

export const costEventBus = new CostEventBus()
costEventBus.setMaxListeners(100)
