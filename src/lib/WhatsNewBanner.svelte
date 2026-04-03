<script>
    import { navigateTo } from '../core/navigation.js';
    import { currentPage, gameRunning } from '../stores.js';

    const WHATS_NEW_MESSAGE = 'Multiplayer is here!';
    const STORAGE_KEY = 'whats-new-dismissed';

    function djb2(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
        }
        return hash.toString(36);
    }

    const currentHash = djb2(WHATS_NEW_MESSAGE);

    let visible = true;
    try {
        visible = localStorage.getItem(STORAGE_KEY) !== currentHash;
    } catch {}

    let dismissing = false;

    function persistDismiss() {
        try {
            localStorage.setItem(STORAGE_KEY, currentHash);
        } catch {}
    }

    function dismiss() {
        persistDismiss();
        dismissing = true;
    }

    function dismissImmediate() {
        persistDismiss();
        visible = false;
    }

    function handleAnimationEnd() {
        if (dismissing) {
            visible = false;
        }
    }
</script>

{#if visible && $currentPage === 'main' && !$gameRunning}
    <div class="whats-new-banner" class:dismissing onanimationend={handleAnimationEnd}>
        <span class="banner-label">New</span>
        <span class="banner-message">{WHATS_NEW_MESSAGE} <a href="#multiplayer" class="banner-link" onclick={(e) => { e.preventDefault(); dismissImmediate(); navigateTo('multiplayer'); }}>Create an island and play with friends.</a></span>
        <button class="banner-dismiss" aria-label="Dismiss" onclick={dismiss}>×</button>
    </div>
{/if}

<style>
    @keyframes fade-out {
        from { opacity: 1; }
        to { opacity: 0; }
    }

    .whats-new-banner {
        position: fixed;
        top: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        box-sizing: border-box;
        background: var(--color-bg-panel);
        border: 1px solid rgba(255, 215, 0, 0.2);
        border-radius: 6px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
    }

    .whats-new-banner.dismissing {
        animation: fade-out 0.2s ease-out forwards;
    }

    .banner-label {
        font-size: 0.65rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: #1a1a1a;
        background: var(--color-primary);
        padding: 1px 6px;
        border-radius: 3px;
        flex-shrink: 0;
    }

    .banner-message {
        color: var(--color-text-medium);
        font-size: 0.8rem;
    }

    .banner-link {
        color: var(--color-primary);
        text-decoration: none;
    }

    .banner-link:hover {
        text-decoration: underline;
    }

    .banner-dismiss {
        background: none;
        border: none;
        color: var(--color-text-muted);
        font-size: 1.1rem;
        cursor: pointer;
        padding: 0 2px;
        line-height: 1;
        flex-shrink: 0;
        transition: color 0.15s;
    }

    .banner-dismiss:hover {
        color: var(--color-primary);
    }

    @media (max-width: 480px) {
        .whats-new-banner {
            left: 8px;
            right: 8px;
            transform: none;
            padding: 5px 10px;
            gap: 6px;
        }

        .banner-message {
            font-size: 0.72rem;
        }
    }
</style>
