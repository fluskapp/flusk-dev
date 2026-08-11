/**
 * The client, in load order: vocabulary, then the tool windows and views,
 * then the gestures, then boot. Every module is plain JS in a template
 * string — no build step, no framework, no dependencies.
 */
import { CLIENT_ATTENTION_JS } from "./client-attention.js";
import { CLIENT_BOOT_JS } from "./client-boot.js";
import { CLIENT_CHAT_JS } from "./client-chat.js";
import { CLIENT_CHAT_STREAM_JS } from "./client-chat-stream.js";
import { CLIENT_CORE_JS } from "./client-core.js";
import { CLIENT_CURSOR_JS } from "./client-cursor.js";
import { CLIENT_DETAIL_JS } from "./client-detail.js";
import { CLIENT_DOCS_JS } from "./client-docs.js";
import { CLIENT_FILE_JS } from "./client-file.js";
import { CLIENT_FILE_PEEK_JS } from "./client-file-peek.js";
import { CLIENT_FIND_JS } from "./client-find.js";
import { CLIENT_FIND_ROWS_JS } from "./client-find-rows.js";
import { CLIENT_FIND_STATE_JS } from "./client-find-state.js";
import { CLIENT_GRIPS_JS } from "./client-grips.js";
import { CLIENT_JOURNAL_JS } from "./client-journal.js";
import { CLIENT_KEYS_JS } from "./client-keys.js";
import { CLIENT_MD_JS } from "./client-md.js";
import { CLIENT_PROJECT_JS } from "./client-project.js";
import { CLIENT_RUN_JS } from "./client-run.js";
import { CLIENT_RUNS_JS } from "./client-runs.js";
import { CLIENT_STAGES_JS } from "./client-stages.js";
import { CLIENT_STATUS_JS } from "./client-status.js";
import { CLIENT_TABS_JS } from "./client-tabs.js";
import { CLIENT_TREE_JS } from "./client-tree.js";

export const CLIENT_JS =
	CLIENT_CORE_JS +
	CLIENT_GRIPS_JS +
	CLIENT_STATUS_JS +
	CLIENT_TABS_JS +
	CLIENT_TREE_JS +
	CLIENT_ATTENTION_JS +
	CLIENT_RUNS_JS +
	CLIENT_RUN_JS +
	CLIENT_STAGES_JS +
	CLIENT_JOURNAL_JS +
	CLIENT_DETAIL_JS +
	CLIENT_MD_JS +
	CLIENT_DOCS_JS +
	CLIENT_FILE_JS +
	CLIENT_FILE_PEEK_JS +
	CLIENT_FIND_STATE_JS +
	CLIENT_FIND_JS +
	CLIENT_FIND_ROWS_JS +
	CLIENT_PROJECT_JS +
	CLIENT_CHAT_JS +
	CLIENT_CHAT_STREAM_JS +
	CLIENT_CURSOR_JS +
	CLIENT_KEYS_JS +
	CLIENT_BOOT_JS;
