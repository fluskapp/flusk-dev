// --- BEGIN CUSTOM ---
import { describe, it, expect } from 'vitest';
import { exportCommand } from './export.js';

describe('export command', () => {
  it('has correct name', () => {
    expect(exportCommand.name()).toBe('export');
  });

  it('has three subcommands: setup, test, list', () => {
    const names = exportCommand.commands.map((c) => c.name());
    expect(names).toContain('setup');
    expect(names).toContain('test');
    expect(names).toContain('list');
  });

  it('setup subcommand requires platform argument', () => {
    const setup = exportCommand.commands.find((c) => c.name() === 'setup')!;
    expect(setup.registeredArguments.length).toBe(1);
    expect(setup.registeredArguments[0].required).toBe(true);
  });

  it('setup subcommand has endpoint and api-key options', () => {
    const setup = exportCommand.commands.find((c) => c.name() === 'setup')!;
    const optNames = setup.options.map((o) => o.long);
    expect(optNames).toContain('--endpoint');
    expect(optNames).toContain('--api-key');
  });

  it('test subcommand requires platform argument', () => {
    const testCmd = exportCommand.commands.find((c) => c.name() === 'test')!;
    expect(testCmd.registeredArguments.length).toBe(1);
    expect(testCmd.registeredArguments[0].required).toBe(true);
  });

  it('list subcommand has no arguments', () => {
    const list = exportCommand.commands.find((c) => c.name() === 'list')!;
    expect(list.registeredArguments.length).toBe(0);
  });
});
// --- END CUSTOM ---
