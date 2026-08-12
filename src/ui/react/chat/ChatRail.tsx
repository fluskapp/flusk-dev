/** Tool window 5: Chat. The stream wiring lands with the port. */
export function ChatRail() {
	return (
		<aside id="chat">
			<div className="tw-head">
				<span className="tw-num">5</span>
				<span>Chat</span>
				<div className="spacer" />
				<select id="chat-backend" />
				<button id="chat-hide" type="button" title="Hide">×</button>
			</div>
			<div id="chat-log" />
			<div id="chat-composer">
				<textarea id="chat-input" placeholder="Ask about this workspace" />
				<button id="chat-send" type="button">Send</button>
				<button id="chat-stop" type="button" hidden>Stop</button>
			</div>
		</aside>
	);
}
