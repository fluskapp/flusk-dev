/**
 * Register hook — auto-instruments LLM SDKs when loaded via --require.
 * This module has side effects: it starts the OTel SDK at import time.
 */

import { autoInstrument } from './instrumentations/index.js';
import { createSdk } from './create-sdk.js';
import { loadConfig } from './config.js';

autoInstrument();

const config = loadConfig();
const sdk = createSdk(config);
sdk.start();
