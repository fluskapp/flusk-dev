/**
 * The IntelliJ inline banner idiom (EditorNotificationPanel): a quiet panel
 * plate with a status-coloured left edge, an action link, and a dismiss —
 * never a modal, never a toast that steals the pointer.
 */
import "./live.css";

export function ErrorBanner({
	message,
	onRetry,
	onClose,
}: {
	message: string | null;
	onRetry?: () => void;
	onClose?: () => void;
}) {
	if (message === null) return null;
	return (
		<div className="live-error" role="alert">
			<span className="live-error-msg">{message}</span>
			{onRetry !== undefined ? (
				<button type="button" className="live-btn" onClick={onRetry}>
					Retry
				</button>
			) : null}
			{onClose !== undefined ? (
				<button type="button" className="live-btn live-x" aria-label="Dismiss" onClick={onClose}>
					×
				</button>
			) : null}
		</div>
	);
}
