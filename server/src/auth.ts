import { betterAuth } from "better-auth";
import { anonymous } from "better-auth/plugins";

export type Variables = {
	session: { user: { id: string } };
};

export type Env = {
	DB: D1Database;
	API_URL: string;
	BETTER_AUTH_SECRET: string;
	DISCORD_CLIENT_ID?: string;
	DISCORD_CLIENT_SECRET?: string;
};

export function createAuth(env: Env) {
	return betterAuth({
		database: env.DB,
		baseURL: env.API_URL,
		secret: env.BETTER_AUTH_SECRET,
		plugins: [
			anonymous({
				onLinkAccount: async ({ anonymousUser, newUser }) => {
					// Transfer all data from anonymous to linked account
					await env.DB.batch([
						env.DB.prepare(
							"UPDATE memory_completions SET user_id = ? WHERE user_id = ?"
						).bind(newUser.user.id, anonymousUser.user.id),
						env.DB.prepare(
							"UPDATE user_saves SET user_id = ? WHERE user_id = ?"
						).bind(newUser.user.id, anonymousUser.user.id),
						env.DB.prepare(
							"UPDATE user_config SET user_id = ? WHERE user_id = ?"
						).bind(newUser.user.id, anonymousUser.user.id),
					]);
				},
			}),
		],
		socialProviders: {
			...(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET
				? {
						discord: {
							clientId: env.DISCORD_CLIENT_ID,
							clientSecret: env.DISCORD_CLIENT_SECRET,
						},
					}
				: {}),
		},
		trustedOrigins: ["http://localhost:5173", "http://localhost:3000", "https://isle.pizza", "https://dev.isle.pizza"],
	});
}
