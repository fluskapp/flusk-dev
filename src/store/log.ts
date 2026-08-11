/**
 * The file layer: read a namespace's log, and add to it.
 *
 * A batch is written with one append so the operating system takes it as a
 * single O_APPEND write — either the whole transact is in the file or its tail
 * is torn, and a torn tail is exactly the case the reader is built to skip. An
 * implementation that wrote each record separately could interleave two
 * transacts and leave a supersession without the value it belongs to.
 *
 * Skipping the torn tail is only safe because of the order the batch is built
 * in (src/store/transact.ts): a supersession is written BEFORE the value that
 * replaces it, so the prefix a tear leaves behind is always a state the store
 * can still express.
 */
import { type FileHandle, mkdir, open, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { encode, parseRecord, type StoreRecord } from "./record.js";

/** Every readable record, in append order. A missing log is an empty one. */
export async function readLog(path: string): Promise<StoreRecord[]> {
	let text: string;
	try {
		text = await readFile(path, "utf8");
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
		throw e;
	}
	const out: StoreRecord[] = [];
	for (const line of text.split("\n")) {
		if (line.trim() === "") continue;
		const record = parseRecord(line);
		if (record) out.push(record);
	}
	return out;
}

export async function appendLog(path: string, records: StoreRecord[]): Promise<void> {
	if (records.length === 0) return;
	await mkdir(dirname(path), { recursive: true });
	const handle = await open(path, "a+");
	try {
		// A previous process killed mid-write leaves a line with no newline. The
		// batch has to start on a line of its own, or it would be glued onto that
		// fragment and skipped as unreadable — one crash silently eating the
		// next write as well.
		const prefix = (await endsWithNewline(handle)) ? "" : "\n";
		await handle.appendFile(prefix + encode(records), "utf8");
	} finally {
		await handle.close();
	}
}

async function endsWithNewline(handle: FileHandle): Promise<boolean> {
	const { size } = await handle.stat();
	if (size === 0) return true;
	const tail = Buffer.alloc(1);
	await handle.read(tail, 0, 1, size - 1);
	return tail[0] === 0x0a;
}

/**
 * Replace the log wholesale, via a temp file and a rename. Only compaction
 * uses this: a partial rewrite would lose durable history that the append path
 * can never reconstruct, so the new content must land in one atomic step.
 */
export async function writeLog(path: string, records: StoreRecord[]): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const tmp = `${path}.${process.pid}.tmp`;
	await writeFile(tmp, encode(records), "utf8");
	await rename(tmp, path);
}
