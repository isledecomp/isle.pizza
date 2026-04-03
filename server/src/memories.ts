import { Hono } from "hono";
import type { Env } from "./auth";

type AuthSession = {
	user: { id: string };
};

type Variables = {
	session: AuthSession;
};

/** Row shape returned by queries on memory_completions */
interface CompletionRow {
	user_id: string;
	anim_index: number;
	event_id: string;
	completed_at: number;
	participants: string;
	language: string;
}

const VALID_LANGUAGES = new Set([
	"da", "el", "en", "fr", "de", "it", "jp", "ko", "pt", "ru", "es",
]);

function isValidLanguage(lang: unknown): lang is string {
	return typeof lang === "string" && VALID_LANGUAGES.has(lang);
}

function getUserCompletions(db: D1Database, userId: string) {
	return db
		.prepare(
			"SELECT anim_index, event_id, completed_at, participants, language FROM memory_completions WHERE user_id = ? ORDER BY completed_at DESC"
		)
		.bind(userId)
		.all<CompletionRow>();
}

function isValidCompletion(c: {
	animIndex: unknown;
	eventId: unknown;
	language: unknown;
}): boolean {
	if (
		typeof c.animIndex !== "number" ||
		!Number.isInteger(c.animIndex) ||
		c.animIndex < 0
	)
		return false;
	if (typeof c.eventId !== "string" || c.eventId.length > 16) return false;
	if (!isValidLanguage(c.language)) return false;
	return true;
}

/** Auth-protected memory routes (mounted behind auth middleware) */
const memories = new Hono<{ Bindings: Env; Variables: Variables }>();

// Record a single completion
memories.post("/", async (c) => {
	const session = c.get("session");
	const body = await c.req.json<{
		animIndex: number;
		eventId: string;
		participants: Array<{ charIndex: number; displayName: string }>;
		language: string;
	}>();

	if (
		!isValidCompletion(body) ||
		!Array.isArray(body.participants) ||
		body.participants.length === 0
	) {
		return c.json({ error: "Invalid completion data" }, 400);
	}

	const participantsJson = JSON.stringify(body.participants);

	await c.env.DB.prepare(
		"INSERT OR IGNORE INTO memory_completions (user_id, anim_index, event_id, completed_at, participants, language) VALUES (?, ?, ?, ?, ?, ?)"
	)
		.bind(
			session.user.id,
			body.animIndex,
			body.eventId,
			Math.floor(Date.now() / 1000),
			participantsJson,
			body.language
		)
		.run();

	return c.json({ ok: true });
});

// Bulk import from IndexedDB (sync on login)
memories.post("/sync", async (c) => {
	const session = c.get("session");
	const body = await c.req.json<{
		completions: Array<{
			animIndex: number;
			eventId: string;
			t: number;
			participants?: Array<{ charIndex: number; displayName: string }>;
			language: string;
		}>;
	}>();

	if (!Array.isArray(body.completions)) {
		return c.json({ error: "Invalid completions array" }, 400);
	}

	const stmt = c.env.DB.prepare(
		"INSERT OR IGNORE INTO memory_completions (user_id, anim_index, event_id, completed_at, participants, language) VALUES (?, ?, ?, ?, ?, ?)"
	);

	// Find existing event_ids for this user to avoid duplicates
	const existingEvents = await c.env.DB.prepare(
		"SELECT event_id FROM memory_completions WHERE user_id = ?"
	)
		.bind(session.user.id)
		.all<Pick<CompletionRow, "event_id">>();
	const existingSet = new Set(
		existingEvents.results.map((r) => r.event_id)
	);

	// Insert new completions (deduplicate by event_id)
	const batch: D1PreparedStatement[] = [];
	for (const completion of body.completions) {
		if (!isValidCompletion(completion)) continue;
		if (existingSet.has(completion.eventId)) continue;
		if (
			!Array.isArray(completion.participants) ||
			completion.participants.length === 0
		)
			continue;

		batch.push(
			stmt.bind(
				session.user.id,
				completion.animIndex,
				completion.eventId,
				completion.t || Math.floor(Date.now() / 1000),
				JSON.stringify(completion.participants),
				completion.language
			)
		);
		existingSet.add(completion.eventId);
	}

	if (batch.length > 0) {
		await c.env.DB.batch(batch);
	}

	// Return full merged set
	const merged = await getUserCompletions(c.env.DB, session.user.id);
	return c.json({ completions: merged.results });
});

export { memories };
