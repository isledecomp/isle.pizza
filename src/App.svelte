<script>
    import { onMount } from 'svelte';
    import { currentPage, debugEnabled } from './stores.js';
    import { registerServiceWorker, checkCacheStatus } from './core/service-worker.js';
    import { setupCanvasEvents } from './core/emscripten.js';
    import TopContent from './lib/TopContent.svelte';
    import Controls from './lib/Controls.svelte';
    import ReadMePage from './lib/ReadMePage.svelte';
    import ConfigurePage from './lib/ConfigurePage.svelte';
    import FreeStuffPage from './lib/FreeStuffPage.svelte';
    import SaveEditorPage from './lib/SaveEditorPage.svelte';
    import UpdatePopup from './lib/UpdatePopup.svelte';
    import GoodbyePopup from './lib/GoodbyePopup.svelte';
    import ConfigToast from './lib/ConfigToast.svelte';
    import DebugPanel from './lib/DebugPanel.svelte';
    import CanvasWrapper from './lib/CanvasWrapper.svelte';

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

        // Setup canvas events
        setupCanvasEvents();

        // Initialize history state based on current page
        const initialHash = window.location.hash;
        if (initialHash) {
            // Set up proper history state for the current hash
            history.replaceState({ page: 'main' }, '', window.location.pathname);
            history.pushState({ page: $currentPage }, '', initialHash);
        } else {
            history.replaceState({ page: 'main' }, '', window.location.pathname);
        }

        // Handle browser back/forward
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page && e.state.page !== 'main') {
                currentPage.set(e.state.page);
            } else {
                currentPage.set('main');
            }
        });
    });

    // Scroll to top whenever page changes
    $: $currentPage, window.scrollTo(0, 0);
</script>

<!-- Audio element outside page routing so it persists across navigation -->
<audio id="install-audio" loop preload="none">
    <source src="install.mp3" type="audio/mpeg">
</audio>

<GoodbyePopup />
<UpdatePopup />
<ConfigToast />

<div id="main-container">
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

    <div class="footer-disclaimer">
        <p>LEGO® and LEGO Island™ are trademarks of The LEGO Group.</p>
        <p>This is an unofficial fan project and is not affiliated with or endorsed by The LEGO Group.</p>
    </div>

    <div class="app-footer">
        {#if __BUILD_TIME__}
            <p>Last updated: {__BUILD_TIME__}</p>
        {:else}
            <p><strong>DEVELOPMENT MODE</strong></p>
        {/if}
    </div>
</div>

<CanvasWrapper />

{#if $debugEnabled}
    <DebugPanel />
{/if}
