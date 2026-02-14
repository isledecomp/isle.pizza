<script>
    export let text = '';
    export let onResetCamera = null;
</script>

<div class="editor-tooltip-wrapper">
    <div class="tooltip-icons">
        {#if onResetCamera}
            <button
                type="button"
                class="reset-camera-btn"
                onclick={onResetCamera}
                title="Reset camera"
            >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a7 7 0 0 0-7 7h2a5 5 0 0 1 9.17-2.74L10 7h5V2l-1.87 1.87A7 7 0 0 0 8 1z"/>
                </svg>
            </button>
        {/if}
        <span class="tooltip-trigger">?
            <span class="tooltip-content">{text}</span>
        </span>
    </div>
    <div class="editor-tooltip-content">
        <slot />
    </div>
</div>

<style>
    .editor-tooltip-wrapper {
        position: relative;
        width: 100%;
    }

    .tooltip-icons {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .reset-camera-btn {
        position: relative;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background-color: var(--color-border-medium);
        color: #eee;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        padding: 0;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
    }

    /* Expand touch target on mobile */
    @media (pointer: coarse) {
        .reset-camera-btn::before {
            content: '';
            position: absolute;
            inset: -10px;
        }
    }

    @media (hover: hover) {
        .reset-camera-btn:hover {
            background-color: var(--color-primary);
            color: var(--color-bg-panel);
        }
    }

    .reset-camera-btn:active {
        background-color: var(--color-primary);
        color: var(--color-bg-panel);
    }

    .editor-tooltip-content {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
</style>
