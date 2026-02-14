import type { LLMCallEntity, AnalyzeSessionEntity, ProfileSessionEntity, PerformancePatternEntity } from '@flusk/entities';
import type { ModelCount } from './sqlite/repositories/llm-call/count-by-model.js';

export interface LLMCallMethods {
  create: (data: Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>) => LLMCallEntity;
  findById: (id: string) => LLMCallEntity | null;
  findByPromptHash: (hash: string) => LLMCallEntity | null;
  list: (limit?: number, offset?: number) => LLMCallEntity[];
  countByModel: () => ModelCount[];
  sumCost: () => number;
  sumCostSince: (since: string) => number;
  countDuplicates: () => number;
}

export interface AnalyzeSessionMethods {
  create: (data: Omit<AnalyzeSessionEntity, 'id' | 'createdAt' | 'updatedAt'>) => AnalyzeSessionEntity;
  findById: (id: string) => AnalyzeSessionEntity | null;
  list: (limit?: number, offset?: number) => AnalyzeSessionEntity[];
  update: (id: string, data: Partial<Pick<AnalyzeSessionEntity, 'completedAt' | 'totalCalls' | 'totalCost' | 'modelsUsed'>>) => AnalyzeSessionEntity | null;
}

export interface ProfileSessionMethods {
  create: (data: Omit<ProfileSessionEntity, 'id' | 'createdAt' | 'updatedAt'>) => ProfileSessionEntity;
  findById: (id: string) => ProfileSessionEntity | null;
  list: (limit?: number, offset?: number) => ProfileSessionEntity[];
}

export interface PatternMethods {
  create: (data: Omit<PerformancePatternEntity, 'id' | 'createdAt' | 'updatedAt'>) => PerformancePatternEntity;
  findByProfileId: (profileSessionId: string) => PerformancePatternEntity[];
  list: (limit?: number, offset?: number) => PerformancePatternEntity[];
}

export interface StorageAdapter {
  mode: 'sqlite' | 'postgres';
  llmCalls: LLMCallMethods;
  analyzeSessions: AnalyzeSessionMethods;
  profileSessions: ProfileSessionMethods;
  patterns: PatternMethods;
}
