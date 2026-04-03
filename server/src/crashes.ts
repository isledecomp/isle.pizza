import { Hono } from "hono";
import { createAuth, type Env } from "./auth";

type Variables = {
	session: { user: { id: string } };
};

export const crashes = new Hono<{ Bindings: Env; Variables: Variables }>();

crashes.post("/", async (c) => {
	let body;
	try {
		body = await c.req.json();
	} catch {
		return c.json({ error: "invalid JSON" }, 400);
	}

	const { stack, buildVersion, wasmVersion } = body;

	if (!stack || typeof stack !== "string") {
		return c.json({ error: "stack is required" }, 400);
	}

	const stk = stack.slice(0, 8192);
	const bv = typeof buildVersion === "string" ? buildVersion.slice(0, 40) : null;
	const wv = typeof wasmVersion === "string" ? wasmVersion.slice(0, 40) : null;
	const ua = (c.req.header("user-agent") || "").slice(0, 512);

	// Try to get user_id from session (no auth required — crash reports are anonymous by default)
	let userId: string | null = null;
	try {
		const auth = createAuth(c.env);
		const session = await auth.api.getSession({ headers: c.req.raw.headers });
		userId = session?.user?.id || null;
	} catch {}

	await c.env.DB.prepare(
		"INSERT INTO crash_reports (stack, build_version, wasm_version, user_agent, user_id) VALUES (?, ?, ?, ?, ?)"
	)
		.bind(stk, bv, wv, ua, userId)
		.run();

	return c.body(null, 204);
});
