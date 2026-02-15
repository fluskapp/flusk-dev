/**
 * TUI Screen: Models — per-model cost breakdown
 */

import React from 'react';
// @ts-ignore ink types use exports field
import { Box, Text } from 'ink';
import { useApi } from '../hooks/use-api.js';

interface ModelData {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
  avgLatencyMs: number;
}

export interface ModelsScreenProps {
  endpoint: string;
  apiKey: string;
}

export function ModelsScreen({ endpoint, apiKey }: ModelsScreenProps) {
  const models = useApi<ModelData[]>(endpoint, '/api/v1/models/breakdown', apiKey);

  if (models.loading) return <Text>Loading models...</Text>;
  if (models.error) return <Text color="red">Error: {models.error}</Text>;
  const data = models.data || [];
  if (data.length === 0) return <Text dimColor>No model data yet</Text>;

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">Model Breakdown</Text>
      <Box marginTop={1} flexDirection="column">
        <Text bold>
          {'Model'.padEnd(25)} {'Calls'.padStart(8)} {'Tokens'.padStart(10)} {'Cost'.padStart(10)} {'Avg ms'.padStart(8)}
        </Text>
        <Text dimColor>{'─'.repeat(65)}</Text>
        {data.map((m) => (
          <Text key={m.model}>
            {m.model.padEnd(25)} {String(m.calls).padStart(8)} {m.tokens.toLocaleString().padStart(10)} {'$' + m.cost.toFixed(2).padStart(9)} {String(m.avgLatencyMs).padStart(8)}
          </Text>
        ))}
      </Box>
    </Box>
  );
}
