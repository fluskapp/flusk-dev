/** The one icon element. Size rides on font-size so icons scale with rows. */
import { ICONS } from "./icons.js";

export function Ic({ name, size = 16 }: { name: string; size?: number }) {
	const shape = ICONS[name];
	if (shape === undefined) return null;
	return (
		<svg
			className="ic"
			width={size}
			height={size}
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.5"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			{shape}
		</svg>
	);
}
