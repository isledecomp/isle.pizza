import { WdbParser } from './formats/WdbParser.js';

let pending = null;

/**
 * Fetch and parse WORLD.WDB once, returning cached result on subsequent calls.
 * Concurrent callers share the same in-flight request.
 * @returns {Promise<{ wdbParser: WdbParser, wdbData: object }>}
 */
export function getWdb() {
    if (!pending) {
        pending = (async () => {
            const response = await fetch('/LEGO/data/WORLD.WDB');
            if (!response.ok) {
                throw new Error(`Failed to load WORLD.WDB: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const wdbParser = new WdbParser(buffer);
            const wdbData = wdbParser.parse();
            return { wdbParser, wdbData };
        })();
    }
    return pending;
}
