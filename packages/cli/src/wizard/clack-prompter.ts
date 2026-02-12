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
      validate: opts.validate,
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

  async select(opts) {
    const result = await p.select({
      message: opts.message,
      options: opts.options,
    });
    return assertNotCancelled(result) as string;
  },

  async multiselect(opts) {
    const result = await p.multiselect({
      message: opts.message,
      options: opts.options,
      required: opts.required,
    });
    return assertNotCancelled(result) as string[];
  },

  spinner(): ProgressHandle {
    const s = p.spinner();
    return {
      update: (msg) => s.start(msg),
      stop: (msg) => s.stop(msg),
    };
  },
};
