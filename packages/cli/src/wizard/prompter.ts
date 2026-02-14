/** @generated —
 * Abstract WizardPrompter interface — no UI dependency.
 * Implementations: ClackPrompter (CLI), future WebPrompter.
 */

export interface ProgressHandle {
  update(message: string): void;
  stop(message?: string): void;
}

export interface WizardPrompter {
  intro(title: string): void;
  outro(message: string): void;
  note(message: string, title?: string): void;

  text(opts: {
    message: string;
    placeholder?: string;
    validate?: (value: string) => string | undefined;
  }): Promise<string>;

  confirm(opts: { message: string; initialValue?: boolean }): Promise<boolean>;

  select<T extends string>(opts: {
    message: string;
    options: Array<{ value: T; label: string; hint?: string }>;
  }): Promise<T>;

  multiselect<T extends string>(opts: {
    message: string;
    options: Array<{ value: T; label: string; hint?: string }>;
    required?: boolean;
  }): Promise<T[]>;

  spinner(): ProgressHandle;
}
