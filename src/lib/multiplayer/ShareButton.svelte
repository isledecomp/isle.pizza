<script>
    export let shareFeedback = '';
    export let onShare;
</script>

<button class="share-btn" class:copied={shareFeedback} onclick={onShare}>
    {#if shareFeedback}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
        {shareFeedback}
    {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        Share island link
    {/if}
</button>

<style>
    .share-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px;
        border: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 8px;
        background: rgba(255, 215, 0, 0.08);
        color: var(--color-primary);
        font-size: 0.8em;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        width: 100%;
        font-family: inherit;
        box-sizing: border-box;
        outline: none;
    }

    @media (hover: hover) {
        .share-btn:hover {
            background: rgba(255, 215, 0, 0.15);
            border-color: rgba(255, 215, 0, 0.5);
        }
    }

    .share-btn:active {
        transform: scale(0.95);
    }

    .share-btn.copied {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }
</style>
