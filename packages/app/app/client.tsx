import { hydrateRoot } from 'react-dom/client';
import { StartClient } from '@tanstack/start';
import { createRouter } from './router.js';

const router = createRouter();

hydrateRoot(document, <StartClient router={router} />);
