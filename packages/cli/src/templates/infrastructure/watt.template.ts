/**
 * Template for watt.json generation
 * Platformatic Watt configuration for Flusk projects
 */

export interface WattTemplateOptions {
  projectName: string;
  port?: number;
}

/**
 * Generate watt.json template for Platformatic Watt configuration
 */
export function generateWattTemplate(options: WattTemplateOptions): string {
  const { projectName, port = 3000 } = options;

  // Return JSON string directly (not a TS object) since this will be written as JSON
  return JSON.stringify({
    "$schema": "https://platformatic.dev/schemas/v3.37.0/watt",
    "composer": {
      "services": [
        {
          "id": "main",
          "path": "./packages/execution",
          "config": "watt.service.json"
        }
      ],
      "refreshTimeout": 1000
    },
    "server": {
      "hostname": "{HOST}",
      "port": `{PORT}`,
      "logger": {
        "level": "{LOG_LEVEL}"
      }
    },
    "watch": {
      "enabled": "{NODE_ENV !== 'production'}",
      "ignore": [
        "node_modules/**",
        "dist/**",
        "**/*.test.ts",
        "**/*.spec.ts"
      ]
    },
    "metrics": {
      "server": "hide",
      "defaultMetrics": {
        "enabled": true
      }
    }
  }, null, 2);
}

/**
 * Generate watt.service.json template for the main service
 */
export function generateWattServiceTemplate(options: WattTemplateOptions): string {
  const { projectName } = options;

  return JSON.stringify({
    "$schema": "https://platformatic.dev/schemas/v3.37.0/service",
    "service": {
      "openapi": {
        "enabled": true,
        "prefix": "/documentation"
      }
    },
    "plugins": {
      "paths": [
        {
          "path": "./src/plugins",
          "encapsulate": false
        },
        {
          "path": "./src/routes",
          "encapsulate": false
        }
      ]
    },
    "watch": {
      "enabled": "{NODE_ENV !== 'production'}",
      "ignore": [
        "**/*.test.ts",
        "**/*.spec.ts"
      ]
    }
  }, null, 2);
}
