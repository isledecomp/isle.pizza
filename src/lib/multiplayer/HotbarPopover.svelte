<script>
    import { onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';

    export let open = false;
    export let triggerEl = null;
    export let onClose;
    export let align = 'center';

    let popoverEl;

    function handleKeydown(e) {
        if (e.key === 'Escape') {
            onClose();
        }
    }

    function handleClick(e) {
        if (e.button !== 0) return; // Only close on left-click
        if (e.buttons & 2) return;  // Don't close while right mouse button is held
        if (!popoverEl || !triggerEl) return;
        if (!popoverEl.contains(e.target) && !triggerEl.contains(e.target)) {
            onClose();
        }
    }

    $: {
        if (open) {
            window.addEventListener('keydown', handleKeydown);
            window.addEventListener('click', handleClick, true);
        } else {
            window.removeEventListener('keydown', handleKeydown);
            window.removeEventListener('click', handleClick, true);
        }
    }

    onDestroy(() => {
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('click', handleClick, true);
    });
</script>

{#if open}
    <div class="popover" class:align-start={align === 'start'} class:align-end={align === 'end'} bind:this={popoverEl}
        out:fade={{ duration: 120 }}>
        <slot />
    </div>
{/if}

<style>
    .popover {
        position: absolute;
        bottom: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%);
        background: rgba(24, 24, 24, 0.95);
        border: 1px solid var(--color-border-medium);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 8px;
        z-index: 1003;
        animation: popover-in 0.15s ease-out;
    }

    .popover.align-start {
        left: 0;
        transform: none;
        animation: popover-in-start 0.15s ease-out;
    }

    .popover.align-end {
        left: auto;
        right: 0;
        transform: none;
        animation: popover-in-start 0.15s ease-out;
    }

    @keyframes popover-in {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes popover-in-start {
        from {
            opacity: 0;
            transform: translateY(8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
