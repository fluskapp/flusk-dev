/**
 * The one disk read the projects and docs routers make: a file body, already
 * membership-checked by the caller against the scanner's index. Routers stay
 * out of node:fs entirely — every byte they serve passes through here, which
 * is what the repository rule in check-standards.sh pins.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

/** UTF-8 body, throwing as fs does; the router owns the HTTP shape of a miss. */
export const readTextSync = (path: string): string => readFileSync(path, "utf8");

/** Raw bytes, for callers that need to sniff before deciding on a rendering. */
export const readBytes = (path: string): Promise<Buffer> => readFile(path);
