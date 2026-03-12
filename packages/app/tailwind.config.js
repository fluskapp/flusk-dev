// Extends @flusk/ui tailwind config with app-specific content paths

import uiConfig from '@flusk/ui/tailwind.config.js';

/** @type {import('tailwindcss').Config} */
export default {
  ...uiConfig,
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
};
