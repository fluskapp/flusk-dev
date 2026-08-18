/**
 * The dialog's left column, WebStorm's anatomy: "+ Add New" with the v1 type
 * (Task run) and its two templates, then the existing configs grouped with
 * project scope first and global badged ⊙. An unreadable file does not
 * vanish — it greys out at the bottom with its why. One keyboard via
 * use-list-nav: j/k and the arrows walk, Enter picks.
 */
import { useListNav } from "../kit/use-list-nav.js";
import { Ic } from "../system/Icon.js";
import { EMPTY_LABEL, type ConfigMetaShape, type SkippedShape } from "./widget-model.js";

export type AddTemplate = "blank" | "spec" | "dry";

const ADDS: { key: AddTemplate; label: string; hint: string }[] = [
	{ key: "blank", label: "Task run", hint: "A blank task configuration" },
	{ key: "spec", label: "from spec…", hint: "The spec IS the task" },
	{ key: "dry", label: "dry preview…", hint: "Prefills the scripted provider for a dry look" },
];

export function ConfigList({
	configs,
	skipped,
	selected,
	onPick,
	onAdd,
}: {
	configs: ConfigMetaShape[];
	skipped: SkippedShape[];
	selected: string | null;
	onPick: (name: string) => void;
	onAdd: (t: AddTemplate) => void;
}) {
	const ordered = [
		...configs.filter((c) => c.scope === "project"),
		...configs.filter((c) => c.scope === "global"),
	];
	const count = ADDS.length + ordered.length;
	const nav = useListNav(count, (i) => {
		const add = ADDS[i];
		if (add !== undefined) onAdd(add.key);
		else {
			const c = ordered[i - ADDS.length];
			if (c !== undefined) onPick(c.name);
		}
	});

	const row = (
		at: number,
		key: string,
		body: React.ReactNode,
		on: boolean,
		act: () => void,
		title?: string,
	) => (
		<div
			key={key}
			data-at={at}
			className={`rc-row${on ? " on" : ""}${at === nav.cursor ? " cur" : ""}`}
			title={title}
			onClick={() => {
				nav.setCursor(at);
				act();
			}}
		>
			{body}
		</div>
	);

	return (
		<div
			className="rc-list knav"
			tabIndex={0}
			ref={nav.ref}
			role="listbox"
			aria-label="Run configurations"
			onKeyDown={(e) => nav.handleKey(e, false)}
		>
			<div className="rc-group">
				<Ic name="run" size={14} /> Add New
			</div>
			{ADDS.map((a, i) =>
				row(i, `add-${a.key}`, <span className={a.key === "blank" ? "" : "rc-sub"}>{a.label}</span>, false, () => onAdd(a.key), a.hint),
			)}
			<div className="rc-group">Task run</div>
			{ordered.length === 0 ? (
				<div className="rc-empty" onClick={() => onAdd("blank")}>{`No run configurations. ${EMPTY_LABEL}`}</div>
			) : (
				ordered.map((c, i) =>
					row(
						ADDS.length + i,
						`${c.scope}:${c.name}`,
						<>
							<span className="mono rc-name">{c.name}</span>
							{c.scope === "global" ? <span className="rc-badge" title="~/.flusk/runs — global scope">⊙</span> : null}
							{c.fake !== undefined ? <span className="rc-badge" title="scripted provider">fake</span> : null}
						</>,
						c.name === selected,
						() => onPick(c.name),
					),
				)
			)}
			{skipped.length > 0 ? (
				<>
					<div className="rc-group">Skipped</div>
					{skipped.map((s) => (
						<div key={s.path} className="rc-row rc-skip" title={s.why}>
							<span className="mono rc-name">{s.path.split("/").pop()}</span>
							<span className="rc-why">{s.why}</span>
						</div>
					))}
				</>
			) : null}
		</div>
	);
}
