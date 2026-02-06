/**
 * Quick test to verify app factory compilation
 */
import { createApp } from './app.js';

async function testApp() {
  const app = await createApp({ logger: false });

  console.log('App created successfully!');
  console.log('Routes:');
  app.printRoutes();

  await app.close();
}

testApp().catch(console.error);
