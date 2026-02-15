/**
 * WizardPrompter implementation using @clack/prompts.
 */

import * as p from '@clack/prompts';
import type { WizardPrompter, ProgressHandle } from './prompter.js';

function assertNotCancelled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }
  return value as T;
}

export const clackPrompter: WizardPrompter = {
  intro: (title) => p.intro(title),
  outro: (message) => p.outro(message),
  note: (message, title) => p.note(message, title),

  async text(opts) {
    const result = await p.text({
      message: opts.message,
      placeholder: opts.placeholder,
      validate: opts.validate as ((value: string | undefined) => string | Error | undefined) | undefined,
    });
    return assertNotCancelled(result);
  },

  async confirm(opts) {
    const result = await p.confirm({
      message: opts.message,
      initialValue: opts.initialValue,
    });
    return assertNotCancelled(result);
  },

  select<T extends string>(opts: { message: string; options: { value: T; label: string; hint?: string }[] }): Promise<T> {
    return p.select({
      message: opts.message,
      options: opts.options as { value: string; label: string; hint?: string }[],
    }).then((result) => assertNotCancelled(result) as T);
  },

  multiselect<T extends string>(opts: { message: string; options: { value: T; label: string; hint?: string }[]; required?: boolean }): Promise<T[]> {
    return p.multiselect({
      message: opts.message,
      options: opts.options as { value: string; label: string; hint?: string }[],
      required: opts.required,
    }).then((result) => assertNotCancelled(result) as T[]);
  },

  spinner(): ProgressHandle {
    const s = p.spinner();
    return {
      update: (msg) => s.start(msg),
      stop: (msg) => s.stop(msg),
    };
  },
};
