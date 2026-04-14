// Preloads 3D thumbnails for the Memories page.
// Starts a Web Worker that fetches WORLD.WDB, parses it, and renders
// building and actor thumbnails on a background thread using OffscreenCanvas.
// The main thread only receives finished data URLs — zero blocking.
//
// Uses a work-queue pattern: any source can enqueue charIndices via
// enqueueActors(). A single worker processes the queue; when it finishes,
// any newly-queued indices trigger another run automatically.
import { writable } from 'svelte/store';
import { memoryCompletions } from '../stores.js';
import { API_URL } from './config.js';

/** Maps location label (e.g. "Pizzeria") to a data URL of the rendered building. */
export const buildingThumbnails = writable({});

/** Maps charIndex (0-65) to a data URL of the rendered actor. */
export const actorThumbnails = writable({});

/** Prefetched global feed entries (null = not fetched, [] = fetched but empty). */
export const latestMemoriesCache = writable(null);

// --- Work queue state ---
let renderedActors = new Set();
let buildingsRendered = false;
let activeWorker = null;
let pendingActors = new Set();  // indices waiting to be rendered

/**
 * Add charIndices to the render queue and flush if no worker is active.
 * Safe to call from any source at any time — indices are deduplicated.
 */
function enqueueActors(indices) {
    for (const i of indices) {
        if (!renderedActors.has(i)) pendingActors.add(i);
    }
    flushQueue();
}

/** If there's pending work and no active worker, spawn one. */
function flushQueue() {
    if (activeWorker) return;
    const includeBuildings = !buildingsRendered;
    const batch = [...pendingActors];
    pendingActors.clear();
    if (batch.length === 0 && !includeBuildings) return;
    spawnWorker(batch, includeBuildings);
}

export function initThumbnails() {
    memoryCompletions.subscribe(completions => {
        if (completions === null) return;
        const indices = [];
        for (const c of completions) {
            if (c.participants) {
                for (const p of c.participants) indices.push(p.charIndex);
            }
        }
        enqueueActors(indices);
    });

    // Prefetch global feed so its actor thumbnails render alongside the user's own
    prefetchLatestMemories();
}

async function prefetchLatestMemories() {
    try {
        const res = await fetch(`${API_URL}/api/memories/latest`);
        if (!res.ok) return;
        const data = await res.json();
        const entries = data.entries || [];
        latestMemoriesCache.set(entries);

        const indices = [];
        for (const e of entries) {
            for (const p of e.participants) indices.push(p.charIndex);
        }
        if (indices.length > 0) enqueueActors(indices);
    } catch {
        // Non-critical — page will show fallback letters
    }
}

function spawnWorker(actorIndices, includeBuildings) {
    try {
        const worker = new Worker(
            new URL('./thumbnails.worker.js', import.meta.url),
            { type: 'module' }
        );
        activeWorker = worker;

        worker.onmessage = (e) => {
            if (worker !== activeWorker) return;

            switch (e.data.type) {
                case 'buildings':
                    buildingThumbnails.set(e.data.thumbnails);
                    buildingsRendered = true;
                    break;
                case 'actors':
                    actorThumbnails.update(current => ({
                        ...current,
                        ...e.data.thumbnails
                    }));
                    for (const i of actorIndices) renderedActors.add(i);
                    worker.terminate();
                    activeWorker = null;
                    // Process anything that was enqueued while we were busy
                    flushQueue();
                    break;
                case 'error':
                    console.warn('[Thumbnails] Worker error:', e.data.message);
                    worker.terminate();
                    activeWorker = null;
                    break;
            }
        };

        worker.onerror = (e) => {
            console.warn('[Thumbnails] Worker failed:', e.message);
            if (worker === activeWorker) activeWorker = null;
        };

        worker.postMessage({ actorIndices, skipBuildings: !includeBuildings });
    } catch (e) {
        console.warn('[Thumbnails] Thumbnails unavailable:', e);
    }
}
