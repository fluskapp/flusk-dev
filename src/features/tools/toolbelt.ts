/**
 * The default toolbelt — what a run gets unless extensions add to it. Owned
 * by the tools feature so both the CLI and the app's run manager share one
 * answer to "which tools exist".
 */
import { bashTool } from "./bash.repository.js";
import { editTool } from "./edit.repository.js";
import { globTool } from "./glob.repository.js";
import { grepTool } from "./grep.repository.js";
import { readTool } from "./read.repository.js";
import type { Tool } from "./tool.js";
import { writeTool } from "./write.repository.js";

export const DEFAULT_TOOLS: Tool[] = [readTool, bashTool, writeTool, editTool, globTool, grepTool];
