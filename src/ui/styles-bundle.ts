/**
 * One import for the page: the stylesheet in cascade order. Tokens first
 * (styles-theme.ts is the palette and stays as it is), then window chrome,
 * then the pieces that live inside it.
 */
import { CHAT_CSS } from "./styles-chat.js";
import { CHROME_CSS } from "./styles-chrome.js";
import { DOCS_CSS } from "./styles-docs.js";
import { FIND_CSS } from "./styles-find.js";
import { MD_CSS } from "./styles-md.js";
import { THEME_CSS } from "./styles-theme.js";
import { TRANSCRIPT_CSS } from "./styles-transcript.js";
import { TREE_CSS } from "./styles-tree.js";
import { WIDGETS_CSS } from "./styles-widgets.js";
import { WORK_CSS } from "./styles-work.js";

export const ALL_CSS =
	THEME_CSS +
	CHROME_CSS +
	TREE_CSS +
	WORK_CSS +
	TRANSCRIPT_CSS +
	DOCS_CSS +
	MD_CSS +
	FIND_CSS +
	WIDGETS_CSS +
	CHAT_CSS;
