const DB_NAME = 'isle-pizza-textures';
const DB_VERSION = 1;
const STORE_NAME = 'custom-textures';

let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (db.objectStoreNames.contains(STORE_NAME)) {
                db.deleteObjectStore(STORE_NAME);
            }
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('textureName', 'textureName', { unique: false });
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });

    return dbPromise;
}

/**
 * Save a processed (quantized + squared) custom texture to IndexedDB.
 * @param {{ width: number, height: number, paletteSize: number, palette: Array<{r:number,g:number,b:number}>, pixels: Uint8Array }} textureData
 * @param {string} textureName - The game texture this was quantized for (e.g. 'rcfrnt.gif')
 * @returns {Promise<string>} The generated id
 */
export async function saveCustomTexture(textureData, textureName) {
    const db = await openDB();
    const id = crypto.randomUUID();
    const record = {
        id,
        timestamp: Date.now(),
        textureName,
        width: textureData.width,
        height: textureData.height,
        paletteSize: textureData.paletteSize,
        palette: textureData.palette,
        pixels: textureData.pixels
    };

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve(id);
        tx.onerror = () => reject(tx.error);
    });
}

/**
 * List custom textures for a specific game texture, sorted by timestamp descending.
 * @param {string} textureName - Filter by game texture name (e.g. 'rcfrnt.gif')
 * @returns {Promise<Array>}
 */
export async function listCustomTextures(textureName) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).index('textureName').getAll(textureName);
        request.onsuccess = () => {
            const results = request.result;
            results.sort((a, b) => b.timestamp - a.timestamp);
            resolve(results);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete a custom texture by id.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteCustomTexture(id) {
    const db = await openDB();

    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}
