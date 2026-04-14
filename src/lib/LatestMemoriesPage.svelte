<script>
    import { actorThumbnails, latestMemoriesCache } from '../core/thumbnails.js';
    import { AnimationTitles } from './multiplayer/animationCatalog.js';
    import { ActorDisplayNames } from '../core/savegame/actorConstants.js';
    import { navigateToMemory, navigateTo, formatDateTime } from '../core/navigation.js';
    import BackButton from './BackButton.svelte';

    const AV_CAP = 3;

    function formatDateShort(timestamp) {
        if (!timestamp) return '';
        const d = new Date(timestamp * 1000);
        const diffMs = Date.now() - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }

    $: loading = $latestMemoriesCache === null;
    $: entries = $latestMemoriesCache || [];

    function handleCardClick(e, eventId) {
        e.preventDefault();
        navigateToMemory(eventId);
    }

    function handleMemoriesLink(e) {
        e.preventDefault();
        navigateTo('memories');
    }
</script>

{#snippet avatarStack(participants)}
    <div class="card-avatars">
        {#each participants.slice(0, AV_CAP) as p}
            <div class="card-av" title="{p.displayName} as {ActorDisplayNames[p.charIndex] || `#${p.charIndex}`}">
                {#if $actorThumbnails[p.charIndex]}
                    <img src={$actorThumbnails[p.charIndex]} alt={ActorDisplayNames[p.charIndex]} />
                {:else}
                    <span class="card-av-fallback">{(ActorDisplayNames[p.charIndex] || '?')[0]}</span>
                {/if}
            </div>
        {/each}
        {#if participants.length > AV_CAP}
            <div class="card-av card-av-overflow">+{participants.length - AV_CAP}</div>
        {/if}
    </div>
{/snippet}

<div class="page-content">
    <BackButton />
    <div class="page-inner-content latest-inner">

    <!-- Hero -->
    <div class="hero">
        <img class="hero-avatar" src="images/nick_closeup.webp" alt="Nick Brick" />
        <div class="hero-text">
            <h1>Latest Memories</h1>
            <p class="hero-subtitle">Players across the island are reenacting animations together in multiplayer. Here are the most recent ones. Want to start collecting your own? Visit <a href="#memories" onclick={handleMemoriesLink}>Nick Brick's Memories</a> to learn more.</p>
        </div>
    </div>

    <!-- Content -->
    {#if loading}
        <div class="feed-list">
            {#each Array(10) as _}
                <div class="feed-card skeleton-card">
                    <div class="card-body">
                        <span class="skeleton-line skeleton-title skeleton-pulse"></span>
                        <span class="skeleton-line skeleton-names skeleton-pulse"></span>
                        <span class="skeleton-line skeleton-time skeleton-pulse"></span>
                    </div>
                    <div class="card-avatars">
                        <div class="card-av skeleton-pulse"></div>
                        <div class="card-av skeleton-pulse"></div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="feed-list">
            {#each entries as entry}
                <a class="feed-card" href="/memory/{entry.eventId}" onclick={e => handleCardClick(e, entry.eventId)}>
                    <div class="card-body">
                        <span class="card-title">{AnimationTitles[entry.animIndex] || `Animation #${entry.animIndex}`}</span>
                        <div class="card-participants">
                            {#each entry.participants as p, idx}
                                {#if idx < AV_CAP}
                                    {#if idx > 0}<span class="card-sep">&middot;</span>{/if}
                                    <span class="card-name">{p.displayName}<span class="card-char">as {ActorDisplayNames[p.charIndex] || `#${p.charIndex}`}</span></span>
                                {/if}
                            {/each}
                            {#if entry.participants.length > AV_CAP}
                                <span class="card-more">+{entry.participants.length - 3}</span>
                            {/if}
                        </div>
                        <span class="card-time" title={formatDateTime(entry.completedAt)}>{formatDateShort(entry.completedAt)}</span>
                    </div>
                    {@render avatarStack(entry.participants)}
                </a>
            {/each}
        </div>
    {/if}

    </div>
</div>

<style>
    .latest-inner {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        text-align: left;
    }

    /* --- Hero --- */
    .hero {
        display: flex;
        align-items: center;
        gap: 14px;
        padding-bottom: 16px;
    }

    .hero-avatar {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    }

    .hero-text {
        flex: 1;
        min-width: 0;
    }

    .hero-text h1 {
        font-size: 1.05em;
        font-weight: 700;
        color: var(--color-text-light);
        margin: 0;
        line-height: 1.2;
    }

    .hero-subtitle {
        font-size: 0.75em;
        color: var(--color-text-muted);
        margin: 4px 0 0;
        line-height: 1.4;
    }

    .hero-subtitle a {
        color: var(--color-primary);
        text-decoration: none;
    }

    .hero-subtitle a:hover {
        text-decoration: underline;
    }

    /* --- Feed list --- */
    .feed-list {
        display: flex;
        flex-direction: column;
    }

    .feed-card {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 8px;
        min-height: 52px;
        border-bottom: 1px solid var(--color-border-dark);
        cursor: pointer;
        transition: background 0.12s;
        text-decoration: none;
        color: inherit;
        border-radius: 4px;
    }

    .feed-card:last-child {
        border-bottom: none;
    }

    .feed-card:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    /* --- Card body (left, fills available space) --- */
    .card-body {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .card-title {
        font-size: 0.85em;
        font-weight: 600;
        color: var(--color-text-light);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.3;
    }

    .card-participants {
        display: flex;
        align-items: baseline;
        overflow: hidden;
        white-space: nowrap;
        line-height: 1.3;
    }

    .card-name {
        font-size: 0.72em;
        color: var(--color-text-medium);
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-char {
        font-size: 0.9em;
        color: var(--color-text-muted);
        margin-left: 3px;
    }

    .card-sep {
        color: var(--color-text-muted);
        margin: 0 5px;
        flex-shrink: 0;
        font-size: 0.72em;
    }

    .card-more {
        font-size: 0.68em;
        color: var(--color-text-muted);
        margin-left: 5px;
        flex-shrink: 0;
    }

    .card-time {
        font-size: 0.65em;
        color: var(--color-text-muted);
        white-space: nowrap;
        line-height: 1.3;
    }

    /* --- Avatar Stack (right side) --- */
    .card-avatars {
        display: flex;
        flex-shrink: 0;
        align-items: center;
    }

    .card-av {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--color-bg-input);
        border: 1.5px solid var(--color-bg-elevated);
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-av + .card-av {
        margin-left: -8px;
    }

    .card-av img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .card-av-fallback {
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-muted);
        text-transform: uppercase;
    }

    .card-av-overflow {
        font-size: 9px;
        font-weight: 700;
        color: var(--color-text-muted);
        background: var(--color-border-dark);
        border-color: var(--color-bg-elevated);
    }

    /* --- Skeleton loading --- */
    .skeleton-card {
        pointer-events: none;
    }

    .skeleton-pulse {
        animation: skeleton-fade 1.2s ease-in-out infinite;
    }

    .card-av.skeleton-pulse {
        background: var(--color-border-dark);
    }

    .skeleton-line {
        display: block;
        background: var(--color-border-dark);
        border-radius: 3px;
    }

    .skeleton-title {
        width: 55%;
        height: 14px;
    }

    .skeleton-names {
        width: 75%;
        height: 12px;
    }

    .skeleton-time {
        width: 30%;
        height: 11px;
    }

    @keyframes skeleton-fade {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.6; }
    }

    /* --- Responsive --- */
    @media (max-width: 480px) {
        .hero-text h1 {
            font-size: 0.9em;
        }

        .hero-avatar {
            width: 48px;
            height: 48px;
        }

        .card-av {
            width: 24px;
            height: 24px;
        }

        .card-av + .card-av {
            margin-left: -6px;
        }

        .card-char {
            display: none;
        }

        .feed-card {
            gap: 10px;
            min-height: 44px;
        }
    }
</style>
