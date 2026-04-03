<script>
    import { flip } from 'svelte/animate';
    import { CharacterNameMap } from '../../core/savegame/actorConstants.js';
    import { AnimationTitles } from './animationCatalog.js';
    import { memoryUnlocks } from '../../stores.js';

    export let animations = [];
    export let currentInterest = null;
    export let pendingInterest = -1;
    export let onToggleInterest = () => {};
    export let isMobile = false;
    export let scrollContainer = null;

    // Build sort order from CharacterNameMap keys (same order as g_characters[])
    const charSortOrder = Object.fromEntries(Object.keys(CharacterNameMap).map((name, i) => [name, i]));

    function missingCount(anim) {
        return anim.slots.filter(s => !s.filled).length;
    }

    // Lowest g_characters index across all slot names (for grouping by character)
    function charOrder(anim) {
        let best = 9999;
        for (const slot of anim.slots) {
            for (const name of slot.names) {
                const order = charSortOrder[name];
                if (order !== undefined && order < best) best = order;
            }
        }
        return best;
    }

    function hasActiveSession(anim) {
        return anim.sessionState > 0; // gathering, countdown, or playing
    }

    $: sorted = [...animations].sort((a, b) => {
        // Active sessions (gathering/countdown/playing) always on top
        const aActive = hasActiveSession(a), bActive = hasActiveSession(b);
        if (aActive !== bActive) return aActive ? -1 : 1;
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        const ma = missingCount(a), mb = missingCount(b);
        if (ma !== mb) return ma - mb;
        if (a.slots.length !== b.slots.length) return a.slots.length - b.slots.length;
        return charOrder(a) - charOrder(b);
    });

    function formatNeeds(slots) {
        const named = [];
        let anyCount = 0;
        for (const s of slots) {
            if (s.filled) continue;
            if (s.names.length === 1 && s.names[0] === 'any') {
                anyCount++;
            } else {
                named.push(s.names.map(n => CharacterNameMap[n] || n).join(' or '));
            }
        }
        if (anyCount) named.push(anyCount === 1 ? '+1 player' : `+${anyCount} players`);
        return named.join(', ');
    }

    function formatWaiting(anim) {
        const unfilled = anim.slots.filter(s => !s.filled);
        const parts = [];
        let anyCount = 0;
        for (const slot of unfilled) {
            if (slot.names.length === 1 && slot.names[0] === 'any') {
                anyCount++;
            } else {
                parts.push(slot.names.map(n => CharacterNameMap[n] || n).join(' or '));
            }
        }
        if (anyCount) parts.push(anyCount === 1 ? '1 more player' : `${anyCount} more players`);
        return `Waiting for ${parts.join(', ')}...`;
    }

    function isInterested(anim) {
        return currentInterest === anim.animIndex || pendingInterest === anim.animIndex;
    }

    function isClickDisabled(anim) {
        if (anim.sessionState === 3) return true; // playing
        if (anim.localInSession) return false; // can always cancel own interest
        if (anim.sessionState >= 1 && !anim.canJoin) return true; // no available slot
        return false;
    }

    let listEl;

    function handleClick(anim) {
        const joining = !isInterested(anim);
        onToggleInterest(anim.animIndex);
        // Scroll to top when joining so the user follows the item as it moves up
        const el = scrollContainer || listEl;
        if (joining && el) {
            el.scrollTo({ top: 0, behavior: 'smooth' });
        }
        // Refocus the game canvas so arrow keys don't scroll the list
        document.getElementById('canvas')?.focus();
    }
</script>

<div class="anim-panel" onfocusin={() => document.getElementById('canvas')?.focus()}>
    <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
    <div class="anim-list" tabindex="-1" bind:this={listEl}>
        {#each sorted as anim (anim.animIndex)}
            <button class="anim-row" tabindex="-1" animate:flip={{ duration: 250 }}
                class:eligible={anim.eligible && anim.sessionState === 0}
                class:interested={isInterested(anim)}
                class:dimmed={!anim.eligible && !anim.atLocation && anim.sessionState === 0}
                class:gathering={anim.sessionState === 1}
                class:countdown={anim.sessionState === 2}
                class:playing={anim.sessionState === 3}
                class:joinable={anim.sessionState >= 1 && anim.canJoin && !anim.localInSession}
                disabled={isClickDisabled(anim)}
                onclick={() => handleClick(anim)}>
                <div class="row-left">
                    <span class="anim-name-row">
                        <span class="anim-name">{AnimationTitles[anim.animIndex] || anim.name}</span>
                        {#if $memoryUnlocks.has(anim.animIndex)}<span class="unlocked-mark" title="Memory unlocked">&#10003;</span>{/if}
                    </span>
                    {#if anim.sessionState === 3 && anim.localInSession}
                        <span class="anim-sub playing-text">Playing...</span>
                    {:else if anim.sessionState === 2 && anim.localInSession}
                        <span class="anim-sub countdown-text">Starting...</span>
                    {:else if anim.sessionState === 1 && anim.localInSession}
                        <span class="anim-sub gathering-text">{formatWaiting(anim)}</span>
                    {:else if anim.sessionState >= 1 && !anim.canJoin}
                        <span class="anim-sub full-text">Roles filled</span>
                    {:else if anim.sessionState >= 1 && anim.canJoin}
                        <span class="anim-sub join-text">Join!</span>
                    {:else if anim.eligible}
                        <span class="anim-sub ready-text">{isMobile ? 'Tap to start' : 'Click to start'}</span>
                    {:else if anim.atLocation}
                        <span class="anim-sub needs-text">{formatNeeds(anim.slots)}</span>
                    {/if}
                </div>
                <span class="slot-dots">
                    {#each [...anim.slots].sort((a, b) => (b.filled ? 1 : 0) - (a.filled ? 1 : 0)) as slot}
                        <span class="dot" class:filled={slot.filled}></span>
                    {/each}
                </span>
            </button>
        {:else}
            <div class="empty">Explore the island to discover scenes</div>
        {/each}
    </div>
</div>

<style>
    .anim-panel {
        width: 300px;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
    }

    .anim-list {
        flex: 1;
        overflow-y: auto;
        overscroll-behavior: contain;
        touch-action: pan-y;
        scrollbar-width: thin;
        scrollbar-color: rgba(255, 255, 255, 0.12) transparent;
    }

    .anim-list::-webkit-scrollbar {
        width: 4px;
    }

    .anim-list::-webkit-scrollbar-track {
        background: transparent;
    }

    .anim-list::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.12);
        border-radius: 2px;
    }

    .anim-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 7px 8px;
        background: none;
        border: none;
        border-left: 3px solid transparent;
        cursor: pointer;
        transition: background 0.12s ease, border-left-color 0.2s ease, opacity 0.2s ease;
        text-align: left;
        font-family: inherit;
        outline: none;
        box-sizing: border-box;
    }

    .anim-row + .anim-row {
        border-top: 1px solid var(--color-surface-subtle);
    }

    @media (hover: hover) {
        .anim-row:hover:not(:disabled) {
            background: rgba(255, 255, 255, 0.06);
        }
    }

    .anim-row.eligible {
        border-left-color: rgba(76, 175, 80, 0.5);
    }

    .anim-row.interested {
        border-left-color: var(--color-primary);
        background: rgba(255, 215, 0, 0.06);
    }

    .anim-row.dimmed {
        opacity: 0.4;
    }

    .anim-row.gathering {
        border-left-color: rgba(255, 193, 7, 0.6);
    }

    .anim-row.countdown {
        border-left-color: rgba(255, 152, 0, 0.7);
    }

    .anim-row.playing {
        border-left-color: rgba(0, 188, 212, 0.7);
        opacity: 0.7;
        cursor: default;
    }

    .anim-row.joinable {
        border-left-color: rgba(100, 181, 246, 0.7);
        background: rgba(100, 181, 246, 0.06);
        animation: joinable-pulse 2s ease-in-out infinite;
    }

    .anim-row:disabled {
        cursor: default;
    }

    .row-left {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
    }

    .anim-name-row {
        display: flex;
        align-items: center;
        min-width: 0;
    }

    .anim-name {
        font-size: 12px;
        font-weight: 600;
        color: var(--color-text-muted);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .unlocked-mark {
        color: rgba(76, 175, 80, 0.7);
        font-size: 10px;
        margin-left: 4px;
        flex-shrink: 0;
    }

    .anim-sub {
        font-size: 10px;
        line-height: 1.2;
    }

    .ready-text {
        color: rgba(76, 175, 80, 0.85);
    }

    .needs-text {
        color: var(--color-text-muted);
        opacity: 0.55;
    }

    .gathering-text {
        color: rgba(255, 193, 7, 0.85);
    }

    .countdown-text {
        color: rgba(255, 152, 0, 0.9);
        animation: pulse 1s ease-in-out infinite;
    }

    .join-text {
        color: rgba(100, 181, 246, 0.95);
        font-weight: 700;
    }

    .full-text {
        color: rgba(255, 107, 107, 0.6);
    }

    .playing-text {
        color: rgba(0, 188, 212, 0.85);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
    }

    @keyframes joinable-pulse {
        0%, 100% { background: rgba(100, 181, 246, 0.04); }
        50% { background: rgba(100, 181, 246, 0.1); }
    }

    .slot-dots {
        display: flex;
        align-items: center;
        gap: 3px;
        flex-shrink: 0;
        margin-left: 8px;
    }

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.18);
    }

    .dot.filled {
        background: rgba(76, 175, 80, 0.7);
        border-color: rgba(76, 175, 80, 0.85);
    }

    .interested .dot.filled {
        background: rgba(255, 215, 0, 0.7);
        border-color: rgba(255, 215, 0, 0.85);
    }

    .empty {
        padding: 12px; text-align: center;
        font-size: 11px; color: var(--color-text-muted); opacity: 0.4;
    }
</style>
