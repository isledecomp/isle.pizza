<script>
    import { onMount } from 'svelte';
    import { computePosition, flip, shift, offset } from '@floating-ui/dom';
    import { currentPage, debugEnabled, gameRunning, multiplayerRoom, scenePlayerEventId, scenePlayerData, matchPathRoute, parseRoute, tryDecodeSceneData, initialInvalidRoom } from './stores.js';
    import { showToast } from './core/toast.js';
    import { registerServiceWorker, checkCacheStatus, requestPersistentStorage } from './core/service-worker.js';
    import { setupCanvasEvents } from './core/emscripten.js';
    import { initMemories } from './core/memories.js';
    import { initCloudSync } from './core/cloud-sync.js';
    import { initAuth } from './core/auth.js';
    import { initThumbnails } from './core/thumbnails.js';
    import TopContent from './lib/TopContent.svelte';
    import AccountIndicator from './lib/AccountIndicator.svelte';
    import MemoriesPage from './lib/MemoriesPage.svelte';
    import Controls from './lib/Controls.svelte';
    import ReadMePage from './lib/ReadMePage.svelte';
    import ConfigurePage from './lib/ConfigurePage.svelte';
    import FreeStuffPage from './lib/FreeStuffPage.svelte';
    import SaveEditorPage from './lib/SaveEditorPage.svelte';
    import MultiplayerPage from './lib/MultiplayerPage.svelte';
    import UpdatePopup from './lib/UpdatePopup.svelte';
    import GoodbyePopup from './lib/GoodbyePopup.svelte';
    import ConfigToast from './lib/ConfigToast.svelte';
    import DebugPanel from './lib/DebugPanel.svelte';
    import ScenePlayerPage from './lib/ScenePlayerPage.svelte';
    import LatestMemoriesPage from './lib/LatestMemoriesPage.svelte';
    import MultiplayerOverlay from './lib/multiplayer/MultiplayerOverlay.svelte';
    import CanvasWrapper from './lib/CanvasWrapper.svelte';
    import CrashOverlay from './lib/CrashOverlay.svelte';

    async function positionTooltip(trigger) {
        const tooltip = trigger.querySelector('.tooltip-content');
        if (!tooltip) return;

        // Temporarily expand tooltip for measurement (keep invisible)
        tooltip.style.maxHeight = 'none';
        tooltip.style.padding = '10px';
        tooltip.style.visibility = 'hidden';
        tooltip.style.opacity = '0';

        const { x, y } = await computePosition(trigger, tooltip, {
            placement: 'top',
            middleware: [
                offset(8),
                flip(),
                shift({ padding: 8 })
            ]
        });

        Object.assign(tooltip.style, {
            left: `${x}px`,
            top: `${y}px`,
            // Clear temporary styles - CSS will handle final visibility
            maxHeight: '',
            padding: '',
            visibility: '',
            opacity: ''
        });
    }

    function setupTooltips() {
        const isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches;

        // Touch devices: position and show on click
        document.addEventListener('click', async (e) => {
            const trigger = e.target.closest('.tooltip-trigger');
            if (trigger) {
                e.preventDefault();
                e.stopPropagation();
                const wasActive = trigger.classList.contains('active');
                document.querySelectorAll('.tooltip-trigger.active').forEach(t => t.classList.remove('active'));
                if (!wasActive) {
                    await positionTooltip(trigger);
                    trigger.classList.add('active');
                }
            } else {
                document.querySelectorAll('.tooltip-trigger.active').forEach(t => t.classList.remove('active'));
            }
        });

        // Desktop: position on hover
        if (!isTouchDevice) {
            document.addEventListener('mouseenter', (e) => {
                const trigger = e.target.closest?.('.tooltip-trigger');
                if (trigger) positionTooltip(trigger);
            }, true);
        }
    }

    onMount(async () => {
        // Disable browser's automatic scroll restoration
        if ('scrollRestoration' in history) {
            history.scrollRestoration = 'manual';
        }

        // Register service worker and initialize
        const registration = await registerServiceWorker();
        if (registration) {
            checkCacheStatus();
        }

        // Request persistent storage to protect OPFS data from browser eviction
        requestPersistentStorage();

        // Setup canvas events
        setupCanvasEvents();

        // Initialize memory persistence (IndexedDB), cloud sync, auth, and building thumbnails
        initMemories();
        initCloudSync();
        initAuth();
        initThumbnails();

        // Setup global tooltip positioning
        setupTooltips();

        // Initialize history state based on current page
        const initialPath = window.location.pathname;
        const initialHash = window.location.hash;
        const state = { page: $currentPage };
        const pathRoute = matchPathRoute(initialPath);

        if (pathRoute) {
            Object.assign(state, pathRoute);
        } else if (initialHash.startsWith('#r/') && $multiplayerRoom) {
            state.room = $multiplayerRoom;
        }

        if (initialInvalidRoom) {
            history.replaceState(state, '', '#multiplayer');
        } else if (pathRoute) {
            history.replaceState(state, '', initialPath);
        } else if (initialHash) {
            history.replaceState({ page: 'main' }, '', window.location.pathname);
            history.pushState({ ...state, fromApp: true }, '', initialHash);
        } else {
            history.replaceState(state, '', window.location.pathname);
        }

        // Show error toast if initial URL had an invalid room
        if (initialInvalidRoom) {
            showToast('Invalid island URL', { error: true, duration: 3000 });
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page === 'multiplayer') {
                multiplayerRoom.set(e.state.room || null);
                currentPage.set('multiplayer');
            } else if (e.state && e.state.page === 'scene-player') {
                scenePlayerEventId.set(e.state.eventId || null);
                scenePlayerData.set(tryDecodeSceneData(e.state.sceneData));
                currentPage.set('scene-player');
            } else if (e.state && e.state.page && e.state.page !== 'main') {
                currentPage.set(e.state.page);
            } else {
                // No state (e.g. URL pasted in address bar) — parse route from URL
                const result = parseRoute();
                multiplayerRoom.set(result.room);
                if (result.eventId) scenePlayerEventId.set(result.eventId);
                scenePlayerData.set(tryDecodeSceneData(result.sceneData));
                currentPage.set(result.page);
                if (result.invalidRoom) {
                    showToast('Invalid island URL', { error: true, duration: 3000 });
                }
            }
        });
    });

    // Scroll to top whenever page changes
    $: $currentPage, window.scrollTo(0, 0);
</script>

<!-- Audio element outside page routing so it persists across navigation -->
<audio id="install-audio" loop preload="none">
    <source src="audio/install.mp3" type="audio/mpeg">
</audio>

<GoodbyePopup />
<UpdatePopup />
<ConfigToast />

{#if !$gameRunning}
    <AccountIndicator />
{/if}

<main id="main-container">
    <div class="page-wrapper" class:active={$currentPage === 'main'}>
        <TopContent />
        <Controls />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'read-me'}>
        <ReadMePage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'configure'}>
        <ConfigurePage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'free-stuff'}>
        <FreeStuffPage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'save-editor'}>
        <SaveEditorPage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'multiplayer'}>
        <MultiplayerPage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'memories'}>
        <MemoriesPage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'latest-memories'}>
        <LatestMemoriesPage />
    </div>
    <div class="page-wrapper" class:active={$currentPage === 'scene-player'}>
        <ScenePlayerPage />
    </div>
    <div class="footer-disclaimer">
        <p>LEGO® and LEGO Island™ are trademarks of The LEGO Group.</p>
        <p>This is an unofficial fan project and is not affiliated with or endorsed by The LEGO Group.</p>
    </div>

    <div class="app-footer">
        {#if __BUILD_TIME__}
            <p>Last updated: {__BUILD_TIME__}{#if __BUILD_VERSION__}&nbsp;({__BUILD_VERSION__}){/if}</p>
        {:else}
            <p><strong>DEVELOPMENT MODE</strong></p>
        {/if}
    </div>
</main>

<CanvasWrapper />
<CrashOverlay />

<MultiplayerOverlay />

{#if $debugEnabled}
    <DebugPanel />
{/if}
