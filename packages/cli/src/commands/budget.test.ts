// --- BEGIN CUSTOM ---
import { describe, it, expect } from 'vitest';
import { budgetCommand } from './budget.js';

describe('budget command', () => {
  it('has correct name', () => {
    expect(budgetCommand.name()).toBe('budget');
  });

  it('has a description', () => {
    expect(budgetCommand.description()).toContain('budget');
  });

  it('has no required arguments', () => {
    expect(budgetCommand.registeredArguments.length).toBe(0);
  });

  it('has no options (simple status command)', () => {
    // budget command shows status, no flags needed
    expect(budgetCommand.options.length).toBe(0);
  });
});
// --- END CUSTOM ---
