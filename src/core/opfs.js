// OPFS Config Manager - handles saving/loading configuration via Origin Private File System
import { configToastVisible, configToastMessage } from '../stores.js';

const CONFIG_FILE = 'isle.ini';
let toastTimeout = null;

// ============================================================================
// Core OPFS Operations
// ============================================================================

/**
 * Get OPFS root directory
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function getOpfsRoot() {
    try {
        return await navigator.storage.getDirectory();
    } catch (e) {
        console.error("OPFS not available or permission denied.", e);
        return null;
    }
}

/**
 * Get a file handle from OPFS
 * @param {string} filename - Name of the file
 * @param {boolean} create - Whether to create the file if it doesn't exist
 * @returns {Promise<FileSystemFileHandle|null>}
 */
export async function getFileHandle(filename = CONFIG_FILE, create = true) {
    try {
        const root = await getOpfsRoot();
        if (!root) return null;
        return await root.getFileHandle(filename, { create });
    } catch (e) {
        if (e.name === 'NotFoundError') return null;
        console.error("Failed to get file handle:", e);
        return null;
    }
}

/**
 * Check if a file exists in OPFS
 * @param {string} filename - Name of the file
 * @returns {Promise<boolean>}
 */
export async function fileExists(filename) {
    const handle = await getFileHandle(filename, false);
    return handle !== null;
}

/**
 * Read a binary file from OPFS
 * @param {string} filename - Name of the file
 * @returns {Promise<ArrayBuffer|null>} - File contents or null if not found
 */
export async function readBinaryFile(filename) {
    try {
        const handle = await getFileHandle(filename, false);
        if (!handle) return null;

        const file = await handle.getFile();
        return await file.arrayBuffer();
    } catch (e) {
        console.error('Failed to read binary file:', e);
        return null;
    }
}

/**
 * Write a binary file to OPFS using Web Worker pattern (Safari-compatible)
 * @param {string} filename - Name of the file
 * @param {ArrayBuffer|Uint8Array} data - Binary data to write
 * @param {boolean} silent - If true, don't show toast notification
 * @param {string} toastMsg - Custom toast message (default: 'Settings saved')
 * @returns {Promise<boolean>} - True if successful
 */
export async function writeBinaryFile(filename, data, silent = false, toastMsg = 'Settings saved') {
    const workerCode = `
        self.onmessage = async (e) => {
            try {
                const root = await navigator.storage.getDirectory();
                const handle = await root.getFileHandle(e.data.filename, { create: true });
                const accessHandle = await handle.createSyncAccessHandle();
                const bytes = new Uint8Array(e.data.buffer);

                accessHandle.truncate(0);
                accessHandle.write(bytes, { at: 0 });
                accessHandle.flush();
                accessHandle.close();

                self.postMessage({ status: 'success', message: 'File saved: ' + e.data.filename });
            } catch (err) {
                self.postMessage({ status: 'error', message: 'Failed to save file: ' + err.message });
            }
        };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    return new Promise((resolve) => {
        worker.postMessage({ filename, buffer: data });

        worker.onmessage = (e) => {
            console.log(e.data.message);
            URL.revokeObjectURL(workerUrl);
            worker.terminate();

            if (e.data.status === 'success') {
                if (!silent) {
                    showToast(toastMsg);
                }
                resolve(true);
            } else {
                resolve(false);
            }
        };

        worker.onerror = (e) => {
            console.error('An error occurred in the file-saving worker:', e.message);
            URL.revokeObjectURL(workerUrl);
            worker.terminate();
            resolve(false);
        };
    });
}

/**
 * Write a text file to OPFS
 * @param {string} filename - Name of the file
 * @param {string} content - Text content to write
 * @param {boolean} silent - If true, don't show toast notification
 * @param {string} toastMsg - Custom toast message
 * @returns {Promise<boolean>} - True if successful
 */
export async function writeTextFile(filename, content, silent = false, toastMsg = 'Settings saved') {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    return writeBinaryFile(filename, data.buffer, silent, toastMsg);
}

/**
 * List all files in OPFS matching a pattern
 * @param {RegExp} pattern - Regular expression to match filenames
 * @returns {Promise<string[]>} - Array of matching filenames
 */
export async function listFiles(pattern) {
    try {
        const root = await getOpfsRoot();
        if (!root) return [];

        const files = [];
        for await (const entry of root.values()) {
            if (entry.kind === 'file' && pattern.test(entry.name)) {
                files.push(entry.name);
            }
        }
        return files;
    } catch (e) {
        console.error('Failed to list files:', e);
        return [];
    }
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    configToastMessage.set(message);
    configToastVisible.set(true);
    toastTimeout = setTimeout(() => configToastVisible.set(false), 2000);
}

// ============================================================================
// Config File Operations
// ============================================================================

export async function loadConfig(form) {
    const handle = await getFileHandle(CONFIG_FILE, true);
    if (!handle) return null;

    try {
        const file = await handle.getFile();
        const text = await file.text();
        if (!text) {
            console.log('No existing config file found, using defaults.');
            return null;
        }

        const config = {};
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.startsWith('[') || !line.includes('=')) continue;
            const [key, ...valueParts] = line.split('=');
            const value = valueParts.join('=').trim();
            config[key.trim()] = value;
        }

        applyConfigToForm(form, config);
        console.log('Config loaded from', CONFIG_FILE);
        return config;
    } catch (e) {
        console.error('Failed to load config:', e);
        return null;
    }
}

function applyConfigToForm(form, config) {
    const elements = form.elements;
    for (const key in config) {
        if (key === "files") {
            const hdMusic = elements["HD Music"];
            const widescreenBgs = elements["Widescreen Backgrounds"];
            const badEnding = elements["Extended Bad Ending FMV"];
            if (hdMusic) hdMusic.checked = config[key].includes("hdmusic.si");
            if (widescreenBgs) widescreenBgs.checked = config[key].includes("widescreen.si");
            if (badEnding) badEnding.checked = config[key].includes("badend.si");
            continue;
        }

        if (key === "directives") {
            const outroFmv = elements["Outro FMV"];
            if (outroFmv) outroFmv.checked = config[key].includes("intro:3");
            continue;
        }

        const element = elements[key];
        if (!element) continue;

        const value = config[key];

        if (element.type === 'checkbox') {
            element.checked = (value === 'YES');
        } else if (element.nodeName === 'RADIO') {
            for (const radio of element) {
                if (radio.value === value) {
                    radio.checked = true;
                    break;
                }
            }
        } else {
            element.value = value;
        }
    }
}

export async function saveConfig(form, getSiFiles, silent = false) {
    let iniContent = '[isle]\n';
    const elements = form.elements;

    for (const element of elements) {
        if (!element.name || element.dataset.notIni === "true") continue;

        let value;
        switch (element.type) {
            case 'checkbox':
                value = element.checked ? 'YES' : 'NO';
                iniContent += `${element.name}=${value}\n`;
                break;
            case 'radio':
                if (element.checked) {
                    value = element.value;
                    iniContent += `${element.name}=${value}\n`;
                }
                break;
            default:
                value = element.value;
                iniContent += `${element.name}=${value}\n`;
                break;
        }
    }

    const hdTextures = elements["Texture Loader"];
    if (hdTextures) {
        iniContent += "[extensions]\n";
        const value = hdTextures.checked ? 'YES' : 'NO';
        iniContent += `${hdTextures.name}=${value}\n`;
    }

    const siFiles = getSiFiles();
    const outroFmv = elements["Outro FMV"];

    if (siFiles.length > 0 || (outroFmv && outroFmv.checked)) {
        iniContent += `SI Loader=YES\n`;
        iniContent += "[si loader]\n";
    }

    if (siFiles.length > 0) {
        iniContent += `files=${siFiles.join(',')}\n`;
    }

    let directives = [];
    if (outroFmv && outroFmv.checked) {
        directives = directives.concat([
            "FullScreenMovie:\\lego\\scripts\\intro:3",
            "Disable3d:\\lego\\scripts\\credits:499",
            "Prepend:\\lego\\scripts\\intro:3:\\lego\\scripts\\credits:499",
            "RemoveWith:\\lego\\scripts\\credits:499:\\lego\\scripts\\intro:3"
        ]);
    }

    if (directives.length > 0) {
        iniContent += `directives=${directives.join(",\\\n")}\n`;
    }

    return writeTextFile(CONFIG_FILE, iniContent, silent);
}
