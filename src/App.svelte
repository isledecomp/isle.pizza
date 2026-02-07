<script>
    import { onMount } from 'svelte';
    import { computePosition, flip, shift, offset } from '@floating-ui/dom';
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

        // Setup canvas events
        setupCanvasEvents();

        // Setup global tooltip positioning
        setupTooltips();

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
    <source src="audio/install.mp3" type="audio/mpeg">
</audio>

<GoodbyePopup />
<UpdatePopup />
<ConfigToast />

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
</main>

<CanvasWrapper />

{#if $debugEnabled}
    <DebugPanel />
{/if}
