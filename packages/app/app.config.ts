import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  vite: {
    plugins: [],
  },
  routers: {
    client: {
      entry: './app/client.tsx',
    },
    server: {
      entry: './app/server.tsx',
    },
  },
});
