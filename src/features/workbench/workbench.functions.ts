/**
 * The workbench-preferences server function: what the client chrome needs
 * before it can size a live tail or preselect the runner widget — one call,
 * both answers.
 */
import { createServerFn } from "@tanstack/react-start";
import { loadConfig } from "../../platform/config/config.js";
import { readWorkbenchFile } from "./workbench-file.repository.js";

export interface UiPrefs {
	/** ui.liveTailEvents after the config merge. */
	liveTailEvents: number;
	/** .flusk/workbench.json team default, or null when none is committed. */
	defaultRunConfig: string | null;
}

export const getUiPrefs = createServerFn().handler(async (): Promise<UiPrefs> => {
	const cwd = process.cwd();
	return {
		liveTailEvents: loadConfig(cwd).ui.liveTailEvents,
		defaultRunConfig: readWorkbenchFile(cwd).file.defaultRunConfig ?? null,
	};
});
