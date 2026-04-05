import { Hono } from "hono";
import type { Env, Variables } from "./auth";

interface SaveRow {
	filename: string;
	data: ArrayBuffer;
}

interface ConfigRow {
	ini_text: string;
}

const VALID_SAVE_FILES = new Set([
	"G0.GS", "G1.GS", "G2.GS", "G3.GS", "G4.GS",
	"G5.GS", "G6.GS", "G7.GS", "G8.GS",
	"Players.gsi", "History.gsi",
]);

const MAX_SAVE_SIZE = 100 * 1024; // 100 KB per file

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

async function computeHash(buffer: ArrayBuffer): Promise<string> {
	const hash = await crypto.subtle.digest("SHA-256", new Uint8Array(buffer));
	return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

function decodeSave(data: string): ArrayBuffer | null {
	try {
		const buffer = base64ToArrayBuffer(data);
		return buffer.byteLength <= MAX_SAVE_SIZE ? buffer : null;
	} catch {
		return null;
	}
}

async function upsertConfig(db: D1Database, userId: string, config: string) {
	await db
		.prepare("INSERT OR REPLACE INTO user_config (user_id, ini_text) VALUES (?, ?)")
		.bind(userId, config.slice(0, 65536))
		.run();
}

const cloud = new Hono<{ Bindings: Env; Variables: Variables }>();

// Helper: build a response entry that sends server data to the client
async function serverDataEntry(filename: string, data: ArrayBuffer) {
	const hash = await computeHash(data);
	return { filename, data: arrayBufferToBase64(data), hash };
}

// Helper: build a response entry that confirms a hash (no data transfer)
function confirmEntry(filename: string, hash: string) {
	return { filename, data: null, hash };
}

// Bidirectional save sync — per-file dirty-state merge
cloud.post("/saves/sync", async (c) => {
	const session = c.get("session");

	const body = await c.req.json<{
		files: Array<{
			filename: string;
			data: string | null;
			hash: string | null;
		}>;
	}>();

	if (!Array.isArray(body.files)) {
		return c.json({ error: "Invalid files array" }, 400);
	}

	const existing = await c.env.DB.prepare(
		"SELECT filename, data FROM user_saves WHERE user_id = ?"
	).bind(session.user.id).all<SaveRow>();

	const serverFiles = new Map(existing.results.map((r) => [r.filename, r.data]));
	const upserts: D1PreparedStatement[] = [];
	const stmt = c.env.DB.prepare(
		"INSERT OR REPLACE INTO user_saves (user_id, filename, data) VALUES (?, ?, ?)"
	);

	const responseFiles = [];
	const clientFilenames = new Set<string>();

	for (const { filename, data, hash } of body.files) {
		if (!VALID_SAVE_FILES.has(filename)) continue;
		clientFilenames.add(filename);
		const serverData = serverFiles.get(filename);

		if (data) {
			// Client has dirty data — accept it
			const buffer = decodeSave(data);
			if (buffer) {
				upserts.push(stmt.bind(session.user.id, filename, buffer));
				responseFiles.push(confirmEntry(filename, await computeHash(buffer)));
			}
		} else if (serverData) {
			// Client is clean — send server data only if hashes differ
			const serverHash = await computeHash(serverData);
			responseFiles.push(hash === serverHash
				? confirmEntry(filename, serverHash)
				: await serverDataEntry(filename, serverData));
		}
	}

	// Server-only files the client didn't mention
	for (const [filename, data] of serverFiles) {
		if (!clientFilenames.has(filename) && VALID_SAVE_FILES.has(filename)) {
			responseFiles.push(await serverDataEntry(filename, data));
		}
	}

	if (upserts.length > 0) await c.env.DB.batch(upserts);
	return c.json({ files: responseFiles });
});

// Incremental save upload (debounced during gameplay)
cloud.post("/saves", async (c) => {
	const session = c.get("session");

	const body = await c.req.json<{
		saves: Array<{ filename: string; data: string }>;
	}>();

	if (!Array.isArray(body.saves) || body.saves.length === 0) {
		return c.json({ error: "No files provided" }, 400);
	}
	const files = body.saves;

	const batch: D1PreparedStatement[] = [];
	const hashes: Array<{ filename: string; hash: string }> = [];
	const stmt = c.env.DB.prepare(
		"INSERT OR REPLACE INTO user_saves (user_id, filename, data) VALUES (?, ?, ?)"
	);

	for (const save of files) {
		if (!VALID_SAVE_FILES.has(save.filename)) continue;
		if (typeof save.data !== "string") continue;
		const buffer = decodeSave(save.data);
		if (!buffer) continue;
		batch.push(stmt.bind(session.user.id, save.filename, buffer));
		hashes.push({ filename: save.filename, hash: await computeHash(buffer) });
	}

	if (batch.length > 0) {
		await c.env.DB.batch(batch);
	}

	return c.json({ ok: true, hashes });
});

// Sync config on login
cloud.post("/config/sync", async (c) => {
	const session = c.get("session");

	// Check if server has existing config
	const existing = await c.env.DB.prepare(
		"SELECT ini_text FROM user_config WHERE user_id = ?"
	)
		.bind(session.user.id)
		.first<ConfigRow>();

	if (existing) {
		// Server has data — return it
		return c.json({ config: existing.ini_text });
	}

	// Server has no data — store what client sends
	const body = await c.req.json<{ config: string }>();
	if (typeof body.config !== "string") {
		return c.json({ error: "Invalid config" }, 400);
	}

	await upsertConfig(c.env.DB, session.user.id, body.config);
	return c.json({ config: null });
});

// Upload config (incremental)
cloud.post("/config", async (c) => {
	const session = c.get("session");
	const body = await c.req.json<{ config: string }>();
	if (typeof body.config !== "string") {
		return c.json({ error: "Invalid config" }, 400);
	}

	await upsertConfig(c.env.DB, session.user.id, body.config);
	return c.json({ ok: true });
});

export { cloud };
