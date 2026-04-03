<script>
    import { onDestroy } from 'svelte';

    export let url;
    export let shareText = '';
    export let compact = false;

    let feedback = '';
    let feedbackTimeout = null;

    function showFeedback(msg) {
        feedback = msg;
        clearTimeout(feedbackTimeout);
        feedbackTimeout = setTimeout(() => { feedback = ''; }, 2000);
    }

    async function handleShare() {
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try {
                const data = { url };
                if (shareText) data.text = shareText;
                await navigator.share(data);
                showFeedback('Shared!');
            } catch { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                showFeedback('Copied!');
            } catch { /* ignore */ }
        }
    }

    onDestroy(() => clearTimeout(feedbackTimeout));
</script>

<button class="share-link-btn" class:compact class:copied={feedback} onclick={handleShare} title="Share link">
    <!-- Ghost: always in flow, sets minimum width to widest state -->
    <span class="share-ghost" aria-hidden="true">
        <svg width="12" height="12" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        Copied!
    </span>
    <!-- Visible content overlaid -->
    <span class="share-visible">
        {#if feedback}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
            </svg>
            {feedback}
        {:else}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            Share
        {/if}
    </span>
</button>

<style>
    .share-link-btn {
        position: relative;
        display: inline-flex;
        background: none;
        border: 1px solid var(--color-border-medium);
        color: var(--color-text-muted);
        cursor: pointer;
        padding: 4px 10px;
        border-radius: 10px;
        font-family: inherit;
        font-size: 0.75em;
        font-weight: 600;
        white-space: nowrap;
        transition: color 0.2s ease, border-color 0.2s ease, background 0.2s ease;
        outline: none;
    }

    .share-ghost {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        visibility: hidden;
    }

    .share-visible {
        position: absolute;
        inset: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
    }

    @media (hover: hover) {
        .share-link-btn:hover {
            color: var(--color-primary);
            border-color: var(--color-primary);
        }
    }

    .share-link-btn:active {
        transform: scale(0.95);
    }

    .share-link-btn.copied {
        background: rgba(74, 222, 128, 0.12);
        border-color: rgba(74, 222, 128, 0.4);
        color: #4ade80;
    }

    .share-link-btn.compact {
        padding: 3px 8px;
        font-size: 0.7em;
    }
</style>
