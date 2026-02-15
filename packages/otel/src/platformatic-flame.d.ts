declare module '@platformatic/flame' {
  export function start(opts?: Record<string, unknown>): void;
  export function stop(): Promise<{ markdown: string; json: unknown }>;
  export function isRunning(): boolean;
}
