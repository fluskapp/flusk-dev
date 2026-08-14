/**
 * `flusk doctor` — is this installation healthy, and if not, exactly what to
 * type. `flusk maintain` — the nightly tick, safe from cron: doctor, index
 * refresh, store sweeps, every step recorded and none allowed to stop the
 * rest. Exit codes are honest: doctor fails only on fail (warns exit 0),
 * maintain fails when any step did.
 */
import { createFactStore } from "../features/facts/facts.repository.js";
import { maintainTick } from "../features/setup/maintain.js";
import { recordDoctor, runChecks } from "../features/setup/doctor.js";
import { FLUSK_NS } from "../features/facts/namespaces.js";
import { loadConfig } from "../platform/config/config.js";

const ICON = { ok: "✓", warn: "!", fail: "✗" } as const;

export async function doctorCmd(opts: { json?: boolean; out?: NodeJS.WritableStream } = {}): Promise<number> {
	const out = opts.out ?? process.stdout;
	const report = runChecks();
	const cfg = loadConfig(process.cwd());
	if (cfg.memory.enabled) await recordDoctor(createFactStore(), FLUSK_NS, report);
	if (opts.json === true) {
		out.write(`${JSON.stringify(report, null, 2)}\n`);
	} else {
		for (const c of report.checks) {
			out.write(`${ICON[c.status]} ${c.name.padEnd(8)} ${c.detail}\n`);
			if (c.fix !== undefined) out.write(`           fix: ${c.fix}\n`);
		}
		out.write(`doctor: ${report.verdict}\n`);
	}
	return report.verdict === "fail" ? 1 : 0;
}

/** Printed, never installed: scheduling is the user's system, not ours. */
export function scheduleText(execPath: string): string {
	if (process.platform === "darwin") {
		const plist = `${process.env.HOME}/Library/LaunchAgents/dev.flusk.maintain.plist`;
		return (
			`# nightly at 03:30 — write this to ${plist} then: launchctl load ${plist}
` +
			`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
` +
			`<plist version="1.0"><dict>
	<key>Label</key><string>dev.flusk.maintain</string>
` +
			`	<key>ProgramArguments</key><array><string>${execPath}</string><string>maintain</string></array>
` +
			`	<key>StartCalendarInterval</key><dict><key>Hour</key><integer>3</integer><key>Minute</key><integer>30</integer></dict>
` +
			`</dict></plist>
`
		);
	}
	return `# nightly at 03:30 — add with: crontab -e
30 3 * * * ${execPath} maintain
`;
}

export async function maintainCmd(
	opts: { json?: boolean; schedule?: boolean; out?: NodeJS.WritableStream } = {},
): Promise<number> {
	const out = opts.out ?? process.stdout;
	if (opts.schedule === true) {
		out.write(scheduleText(process.argv[1] ?? "flusk"));
		return 0;
	}
	const cfg = loadConfig(process.cwd());
	const store = cfg.memory.enabled ? createFactStore() : null;
	const report = await maintainTick(store);
	if (opts.json === true) {
		out.write(`${JSON.stringify(report, null, 2)}\n`);
	} else {
		for (const s of report.steps) out.write(`${s.ok ? "✓" : "✗"} ${s.name.padEnd(8)} ${s.detail}\n`);
		out.write(`maintain: ${report.ok ? "ok" : "step(s) failed"}\n`);
	}
	return report.ok ? 0 : 1;
}
