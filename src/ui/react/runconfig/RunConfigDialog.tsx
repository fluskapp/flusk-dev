/**
 * The Run Configurations dialog — WebStorm's Edit Configurations anatomy as a
 * URL-addressed overlay: `?rc=<name>` selects a config, `?rc=new` a blank
 * form, absence is closed. The file on disk is the truth: Run and Dry read
 * the SAVED config; the red-line idiom disables them until the form is sane.
 * Escape unwinds one layer per press: preview → dialog → gone.
 */
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { getSpecs } from "../../../features/specs/specs.functions.js";
import { ErrorBanner } from "../live/ErrorBanner.js";
import { useServerCall } from "../live/use-server-call.js";
import { ConfigFooter } from "./ConfigFooter.js";
import { ConfigForm } from "./ConfigForm.js";
import { ConfigList, type AddTemplate } from "./ConfigList.js";
import { DryPreview } from "./DryPreview.js";
import { draftFrom, emptyDraft, footerIssue, toConfig, validateDraft, type ConfigDraft } from "./form-model.js";
import { callDelete, callDry, callLaunch, callSave, callVerify, useRunConfigs, type StartedConfigRun } from "./use-runconfigs.js";
import { normalizeDry, verifyCommandCount } from "./widget-model.js";
import "./runconfig.css";

type Prev = Record<string, unknown>;

export function RunConfigDialog({ rc }: { rc: string }) {
	const navigate = useNavigate();
	const rcs = useRunConfigs();
	const [draft, setDraft] = useState<ConfigDraft>(emptyDraft());
	const [template, setTemplate] = useState<AddTemplate>("blank");
	const [dry, setDry] = useState<string | null>(null);
	const [started, setStarted] = useState<StartedConfigRun | null>(null);
	const [refused, setRefused] = useState<string | null>(null);
	const [specs, setSpecs] = useState<string[]>([]);
	const [verify, setVerify] = useState<number | null>(null);
	const loadedFor = useRef<string | null>(null);
	const save = useServerCall(callSave);
	const del = useServerCall(callDelete);
	const launch = useServerCall(callLaunch);
	const dryCall = useServerCall(callDry);

	const close = () => void navigate({ to: ".", search: (p: Prev) => ({ ...p, rc: undefined }) });
	const openAt = (name: string) => void navigate({ to: ".", search: (p: Prev) => ({ ...p, rc: name }) });

	/* One Escape, one layer — capture phase, the palette's idiom, so the
	 * workbench keys behind the overlay never see it. Re-bound each render,
	 * so the closure never goes stale (the palette's own pattern). */
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape") return;
			e.preventDefault();
			e.stopImmediatePropagation();
			if (dry !== null) setDry(null);
			else close();
		};
		document.addEventListener("keydown", onKey, true);
		return () => document.removeEventListener("keydown", onKey, true);
	});

	/* The URL names the selection; the scan fills the form once per rc. */
	useEffect(() => {
		if (rcs.loading || loadedFor.current === rc) return;
		loadedFor.current = rc;
		const meta = rcs.configs.find((c) => c.name === rc);
		setDraft(meta !== undefined ? draftFrom(meta.name, meta.scope, meta) : rc === "new" ? emptyDraft() : { ...emptyDraft(), name: rc });
		setDry(null);
		setStarted(null);
		setRefused(null);
	}, [rc, rcs.loading, rcs.configs]);

	/* The target repo's specs feed the dropdown; its verify commands, the warning. */
	const target = draft.repo !== "" ? draft.repo : rcs.primary;
	useEffect(() => {
		if (target === null) return;
		let on = true;
		void (getSpecs as (a: { data: { repo: string } }) => Promise<{ specs: { name: string }[] }>)({ data: { repo: target } })
			.then((s) => { if (on) setSpecs(s.specs.map((x) => x.name)); })
			.catch(() => { if (on) setSpecs([]); });
		void callVerify(target)
			.then((v) => { if (on) setVerify(verifyCommandCount(v)); })
			.catch(() => { if (on) setVerify(null); });
		return () => { on = false; };
	}, [target]);

	const add = (t: AddTemplate) => {
		setTemplate(t);
		setDraft({ ...emptyDraft(), fake: t === "dry" ? "scripts/demo.json" : "" });
		setDry(null);
		setStarted(null);
		loadedFor.current = "new";
		if (rc !== "new") openAt("new");
	};

	const name = draft.name.trim();
	const saved = rcs.configs.some((c) => c.name === name);
	const issue = footerIssue(validateDraft(draft, { roots: rcs.repos.map((p) => p.path), verifyCommands: verify }));
	const busy = save.loading || del.loading || launch.loading || dryCall.loading;
	const netErr = save.error ?? del.error ?? launch.error ?? dryCall.error ?? rcs.error;
	const clearNet = () => { save.clear(); del.clear(); launch.clear(); dryCall.clear(); };

	const doSave = async () => {
		if (rcs.primary === null) return;
		const r = await save.call({ repo: rcs.primary, name, scope: draft.scope, config: toConfig(draft) });
		if (r === null) return;
		if (!r.ok) { setRefused(r.why ?? "refused"); return; }
		setRefused(null);
		loadedFor.current = name;
		rcs.reload();
		if (rc !== name) openAt(name);
	};
	const doRun = async () => {
		if (rcs.primary === null) return;
		const r = await launch.call({ repo: rcs.primary, name });
		if (r !== null) setStarted(r);
	};
	const doDry = async () => {
		if (rcs.primary === null) return;
		const r = await dryCall.call({ repo: rcs.primary, name });
		if (r !== null) setDry(normalizeDry(r));
	};
	const doDelete = async () => {
		if (rcs.primary === null) return;
		const r = await del.call({ repo: rcs.primary, name, scope: draft.scope });
		if (r === null) return;
		if (!r.ok) { setRefused(r.why ?? "refused"); return; }
		rcs.reload();
		add("blank");
	};

	return (
		<div className="rc-overlay" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
			<div className="rc-card" role="dialog" aria-modal="true" aria-label="Run Configurations">
				<header className="rc-head">
					<span>Run Configurations</span>
					<span className="spacer" />
					<button type="button" className="sys-btn icon bare" title="Close (Escape)" onClick={close}>✕</button>
				</header>
				<div className="rc-body">
					<ConfigList configs={rcs.configs} skipped={rcs.skipped} selected={saved ? name : null} onPick={openAt} onAdd={add} />
					{dry !== null ? (
						<DryPreview text={dry} onBack={() => setDry(null)} />
					) : (
						<ConfigForm draft={draft} patch={(p) => setDraft((d) => ({ ...d, ...p }))} specs={specs} repos={rcs.repos.map((r) => ({ name: r.name, path: r.path }))} focusSpec={template === "spec"} />
					)}
				</div>
				<ErrorBanner message={netErr} onClose={clearNet} />
				<ErrorBanner message={refused} onClose={() => setRefused(null)} />
				<ConfigFooter issue={issue} saved={saved} busy={busy} started={started} onDry={() => void doDry()} onDelete={() => void doDelete()} onRun={() => void doRun()} onSave={() => void doSave()} onCancel={close} />
			</div>
		</div>
	);
}
