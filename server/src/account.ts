import { Hono } from "hono";
import type { Env, Variables } from "./auth";

const account = new Hono<{ Bindings: Env; Variables: Variables }>();

// Delete account and all associated data
account.delete("/", async (c) => {
	const session = c.get("session");
	const userId = session.user.id;

	try {
		await c.env.DB.batch([
			c.env.DB.prepare("DELETE FROM user_saves WHERE user_id = ?").bind(userId),
			c.env.DB.prepare("DELETE FROM user_config WHERE user_id = ?").bind(userId),
			c.env.DB.prepare("DELETE FROM memory_completions WHERE user_id = ?").bind(userId),
			c.env.DB.prepare("UPDATE crash_reports SET user_id = NULL WHERE user_id = ?").bind(userId),
			c.env.DB.prepare('DELETE FROM "session" WHERE "userId" = ?').bind(userId),
			c.env.DB.prepare('DELETE FROM "account" WHERE "userId" = ?').bind(userId),
			c.env.DB.prepare('DELETE FROM "user" WHERE id = ?').bind(userId),
		]);
	} catch (e) {
		console.error("Account deletion failed for user", userId, e);
		return c.json({ error: "Account deletion failed" }, 500);
	}

	return c.json({ ok: true });
});

export { account };
