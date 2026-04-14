import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { createAuth, type Env, type Variables } from "./auth";
import { memories } from "./memories";
import { crashes } from "./crashes";
import { account } from "./account";
import { cloud } from "./cloud";

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for frontend
app.use(
	"*",
	cors({
		origin: ["http://localhost:5173", "http://localhost:3000", "https://isle.pizza", "https://dev.isle.pizza"],
		credentials: true,
	})
);

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// better-auth handles all /api/auth/* routes
app.all("/api/auth/*", async (c) => {
	const auth = createAuth(c.env);
	return auth.handler(c.req.raw);
});

// Public endpoint: all memory event IDs for sitemap generation
app.get("/api/sitemap", async (c) => {
	const results = await c.env.DB.prepare(
		"SELECT event_id, MAX(completed_at) AS completed_at FROM memory_completions GROUP BY event_id ORDER BY completed_at DESC"
	).all<{ event_id: string; completed_at: number }>();

	return c.json({ entries: results.results });
});

// Public endpoint: look up a memory completion by eventId (no auth needed)
app.get("/api/memory/:eventId", async (c) => {
	const eventId = c.req.param("eventId");
	if (!eventId || eventId.length > 16) {
		return c.json({ error: "Invalid eventId" }, 400);
	}

	const result = await c.env.DB.prepare(
		"SELECT anim_index, event_id, completed_at, participants, language FROM memory_completions WHERE event_id = ? LIMIT 1"
	)
		.bind(eventId)
		.first<{
			anim_index: number;
			event_id: string;
			completed_at: number;
			participants: string;
			language: string;
		}>();

	if (!result) {
		return c.json({ error: "Not found" }, 404);
	}

	let participants: unknown[];
	try {
		participants = JSON.parse(result.participants || "[]");
	} catch {
		participants = [];
	}

	return c.json({
		animIndex: result.anim_index,
		eventId: result.event_id,
		completedAt: result.completed_at,
		participants,
		language: result.language,
	});
});

// Public endpoint: latest 10 unique memories for the global feed
app.get("/api/memories/latest", async (c) => {
	const results = await c.env.DB.prepare(
		`SELECT mc.anim_index, mc.event_id, mc.completed_at, mc.participants, mc.language
		 FROM memory_completions mc
		 INNER JOIN (
		     SELECT event_id, MAX(completed_at) AS max_completed_at
		     FROM memory_completions
		     GROUP BY event_id
		     ORDER BY max_completed_at DESC
		     LIMIT 10
		 ) latest ON mc.event_id = latest.event_id AND mc.completed_at = latest.max_completed_at
		 GROUP BY mc.event_id
		 ORDER BY mc.completed_at DESC`
	).all<{ anim_index: number; event_id: string; completed_at: number; participants: string; language: string }>();

	const entries = results.results.map((r) => {
		let participants: unknown[];
		try { participants = JSON.parse(r.participants || "[]"); } catch { participants = []; }
		return {
			animIndex: r.anim_index,
			eventId: r.event_id,
			completedAt: r.completed_at,
			participants,
			language: r.language,
		};
	});

	return c.json({ entries });
});

// Auth middleware for protected routes
const authMiddleware = async (c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) => {
	const auth = createAuth(c.env);
	const session = await auth.api.getSession({
		headers: c.req.raw.headers,
	});

	if (!session) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("session", session);
	await next();
};

// Auth-protected memory routes
app.use("/api/memories", authMiddleware);
app.use("/api/memories/*", authMiddleware);
app.route("/api/memories", memories);

// Account management (delete account)
app.use("/api/account", authMiddleware);
app.route("/api/account", account);

// Cloud sync routes (all auth-protected)
app.use("/api/cloud/*", authMiddleware);
app.route("/api/cloud", cloud);

// Crash reporting (no auth required)
app.route("/api/crash", crashes);

export default app;
