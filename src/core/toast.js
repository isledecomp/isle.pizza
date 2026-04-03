import { configToastVisible, configToastMessage } from '../stores.js';
import { writable } from 'svelte/store';

export const toastError = writable(false);

let toastTimeout = null;

export function showToast(message, { error = false, duration = 2000 } = {}) {
    if (toastTimeout) clearTimeout(toastTimeout);
    configToastMessage.set(message);
    toastError.set(error);
    configToastVisible.set(true);
    toastTimeout = setTimeout(() => {
        configToastVisible.set(false);
        toastError.set(false);
    }, duration);
}
