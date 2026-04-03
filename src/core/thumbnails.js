// Preloads 3D thumbnails for the Memories page.
// Starts a Web Worker that fetches WORLD.WDB, parses it, and renders
// building and actor thumbnails on a background thread using OffscreenCanvas.
// The main thread only receives finished data URLs — zero blocking.
//
// Subscribes to memoryCompletions so thumbnails are (re-)generated whenever
// the set of needed actors changes (e.g. after login, logout→login, new completions).
import { writable } from 'svelte/store';
import { memoryCompletions } from '../stores.js';

/** Maps location label (e.g. "Pizzeria") to a data URL of the rendered building. */
export const buildingThumbnails = writable({});

/** Maps charIndex (0-65) to a data URL of the rendered actor. */
export const actorThumbnails = writable({});

/** Collect unique charIndices from completion data. */
function getNeededActors(completions) {
    const indices = new Set();
    for (const c of completions) {
        if (c.participants) {
            for (const p of c.participants) {
                indices.add(p.charIndex);
            }
        }
    }
    return [...indices];
}

let renderedActors = new Set();
let buildingsRendered = false;
let activeWorker = null;

export function initThumbnails() {
    memoryCompletions.subscribe(completions => {
        if (completions === null) return;

        const needed = getNeededActors(completions);
        const missing = needed.filter(i => !renderedActors.has(i));
        if (missing.length === 0 && buildingsRendered) return;

        spawnWorker(missing, !buildingsRendered);
    });
}

function spawnWorker(actorIndices, includeBuildings) {
    if (activeWorker) {
        activeWorker.terminate();
        activeWorker = null;
    }

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
