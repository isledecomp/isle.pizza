// Navigation utilities
import { currentPage } from '../stores.js';

export function navigateTo(page) {
    currentPage.set(page);
    history.pushState({ page }, '', '#' + page);
}

export function navigateBack() {
    history.back();
}
