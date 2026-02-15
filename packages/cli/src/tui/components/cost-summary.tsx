/**
 * TUI Component: CostSummary — total cost and savings
 */

import React from 'react';
// @ts-ignore ink types use exports field
import { Box, Text } from 'ink';

export interface CostData {
  totalCost: number;
  totalSavings: number;
  callCount: number;
}

export interface CostSummaryProps {
  data: CostData | null;
}

export function CostSummary({ data }: CostSummaryProps) {
  if (!data) return <Text dimColor>No cost data</Text>;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold>💰 Cost Summary</Text>
      <Text>  Total Cost:    <Text color="yellow">${data.totalCost.toFixed(4)}</Text></Text>
      <Text>  Savings:       <Text color="green">${data.totalSavings.toFixed(4)}</Text></Text>
      <Text>  LLM Calls:     <Text>{data.callCount}</Text></Text>
    </Box>
  );
}
