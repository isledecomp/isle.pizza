// Emscripten-related functions for game launching and canvas events
import { gameRunning, debugUIVisible } from '../stores.js';

let progressUpdates = 0;

export function startGame(rendererValue) {
    const mainContainer = document.getElementById('main-container');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const canvas = document.getElementById('canvas');

    if (!window.Module.running) return;

    mainContainer.style.display = 'none';
    canvasWrapper.style.display = 'grid';

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    window.Module["disableOffscreenCanvases"] ||= rendererValue === "0 0x682656f3 0x0 0x0 0x2000000";
    console.log("disableOffscreenCanvases: " + window.Module["disableOffscreenCanvases"]);

    window.Module["removeRunDependency"]("isle");
    canvas.focus();
    gameRunning.set(true);
}

export function setupCanvasEvents() {
    const canvas = document.getElementById('canvas');
    const loadingGifOverlay = document.getElementById('loading-gif-overlay');
    const statusMessageBar = document.getElementById('emscripten-status-message');

    canvas.addEventListener('presenterProgress', function (event) {
        // Intro animation is ready
        if (event.detail.objectName === 'Lego_Smk' && event.detail.tickleState === 1) {
            loadingGifOverlay.style.display = 'none';
            canvas.style.setProperty('display', 'block', 'important');
            debugUIVisible.set(true);
        }
        else if (progressUpdates < 1003) {
            progressUpdates++;
            const percent = (progressUpdates / 1003 * 100).toFixed();
            statusMessageBar.innerHTML = 'Loading LEGO® Island... please wait! <code>' + percent + '%</code>';
        }
    });

    canvas.addEventListener('extensionProgress', function (event) {
        statusMessageBar.innerHTML = 'Loading ' + event.detail.name + '... please wait! <code>' + event.detail.progress + '%</code>';
    });
}
