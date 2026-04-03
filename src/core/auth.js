// Authentication client for isle.pizza API (better-auth)
import { createAuthClient } from 'better-auth/client';
import { anonymousClient } from 'better-auth/client/plugins';
import { writable } from 'svelte/store';
import { API_URL } from './config.js';

export const authClient = createAuthClient({
    baseURL: API_URL,
    plugins: [
        anonymousClient(),
    ],
    fetchOptions: {
        credentials: 'include'
    }
});

// Reactive session store: undefined = loading, null = logged out, object = logged in
export const authSession = writable(undefined);

// Promise that resolves with the initial session once the auth check completes.
// Any module that needs "do X when auth is ready" can `await authReady` instead
// of racing with initAuth() or using coordination flags.
let resolveAuthReady;
export const authReady = new Promise(resolve => { resolveAuthReady = resolve; });

// Check session on load
export async function initAuth() {
    try {
        const session = await authClient.getSession();
        const data = session?.data || null;
        authSession.set(data);
        resolveAuthReady(data);
    } catch (e) {
        // Not logged in or server unavailable
        authSession.set(null);
        resolveAuthReady(null);
    }
}

export async function signInWithDiscord() {
    await authClient.signIn.social({ provider: 'discord', callbackURL: window.location.origin });
}

export async function signInAnonymously() {
    const result = await authClient.signIn.anonymous();
    if (result?.data) {
        authSession.set(result.data);
    }
}

export async function signOut() {
    // Set session to null first so subscribers (e.g. memories.js) can
    // react immediately, even if the server call fails.
    authSession.set(null);
    try {
        await authClient.signOut();
    } catch (e) {
        // Session is already cleared locally; server-side cleanup is best-effort
        console.warn('[Auth] signOut request failed:', e);
    }
}
