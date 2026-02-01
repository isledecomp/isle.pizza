<script>
    /** @type {'left' | 'right'} */
    export let direction = 'left';
    export let onclick = () => {};
    export let disabled = false;
</script>

<button
    type="button"
    class="nav-btn"
    class:disabled
    {onclick}
    aria-label={direction === 'left' ? 'Previous' : 'Next'}
>
    {#if direction === 'left'}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    {:else}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 4l4 4-4 4" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    {/if}
</button>

<style>
    .nav-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-medium);
        border-radius: 50%;
        color: var(--color-text-light);
        cursor: pointer;
        flex-shrink: 0;
        transition: all 0.2s ease;
    }

    .nav-btn:hover:not(.disabled) {
        border-color: var(--color-border-light);
        background: var(--gradient-hover);
    }

    .nav-btn.disabled {
        opacity: 0.3;
        pointer-events: none;
        cursor: default;
    }
</style>
