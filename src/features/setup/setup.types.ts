/**
 * The setup feature's contract: what the doctor reports and what a
 * maintenance tick leaves behind.
 */

export interface SetupCheck {
	name: string;
	status: "ok" | "warn" | "fail";
	detail: string;
	/** The exact command that fixes it; present on warn/fail. */
	fix?: string;
}

export interface DoctorReport {
	at: string;
	checks: SetupCheck[];
	/** fail > warn > ok, the worst status present. */
	verdict: "ok" | "warn" | "fail";
}

export interface MaintainStep {
	name: string;
	ok: boolean;
	detail: string;
}

export interface MaintainReport {
	at: string;
	steps: MaintainStep[];
	ok: boolean;
}
