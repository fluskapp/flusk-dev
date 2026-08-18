/**
 * The environment banner: what is wrong with this machine, and the one command
 * that fixes it — copyable, the way IntelliJ surfaces a broken SDK as a
 * notification with an action rather than a grey sentence. Absent entirely
 * when every recorded check is ok: a healthy environment is not news.
 */
import type { SetupStatus } from "../../../features/setup/setup.functions.js";
import { copyText, useToast } from "../runs/widgets.js";
import { Ic } from "../system/Icon.js";

const DOCTOR = "flusk doctor";

/** warn/fail keep their own colour; "never checked" is dim — an unknown is
 * not a fault, and painting it amber cries wolf on a fresh install. */
const PILL: Record<SetupStatus["worst"], string> = {
	ok: "dim",
	warn: "warn",
	fail: "err",
	unknown: "dim",
};

export function SetupBanner({ setup }: { setup: SetupStatus }) {
	const [toast, showToast] = useToast();
	if (setup.worst === "ok") return null;
	const failing = Object.entries(setup.checks)
		.filter(([, v]) => !v.startsWith("ok:"))
		.map(([k]) => k);
	return (
		<div className="sys-card setup-card">
			<span className={`sys-pill ${PILL[setup.worst]}`}>
				{setup.worst === "unknown" ? "unchecked" : setup.worst}
			</span>
			<span className="setup-msg">
				{failing.length === 0 ? (
					"Environment never checked"
				) : (
					<>
						{failing.map((name) => (
							<span className="sys-chip mono" key={name}>
								{name}
							</span>
						))}
						{failing.length === 1 ? " is unavailable" : " are unavailable"}
					</>
				)}
				{" — run"}
			</span>
			<span className="sys-chip mono">{DOCTOR}</span>
			<button
				type="button"
				className="sys-btn icon"
				title="Copy the command"
				onClick={() => void copyText(DOCTOR, showToast, "Command copied")}
			>
				<Ic name="copy" size={14} />
			</button>
			{toast}
		</div>
	);
}
