<script>
    import { onMount, onDestroy } from 'svelte';
    import { gameRunning, multiplayerRoom, multiplayerPlayerCount, thirdPersonEnabled, showNameBubbles, allowCustomize, connectionStatus, animationState, memoryUnlocks } from '../../stores.js';
    import { resolveCluster, ClusterAnimIndices } from './animationCatalog.js';
    import { keepVisible } from '../../core/keep-visible.js';
    import { emoteOptions, walkOptions, idleOptions, settingsItems } from './constants.js';
    import MultiplayerHotbar from './MultiplayerHotbar.svelte';
    import MultiplayerFab from './MultiplayerFab.svelte';
    import EmoteFan from './EmoteFan.svelte';
    import PeopleIcon from './PeopleIcon.svelte';
    import CountdownOverlay from './CountdownOverlay.svelte';

    let selectedWalk = 0;
    let selectedIdle = 0;
    let activeEmote = -1;
    let badgeBump = false;
    let shareFeedback = '';
    let prevPlayerCount = null;
    let isDesktop = false;

    // Mobile state
    let fanOpen = false;

    const timers = {};
    onDestroy(() => Object.values(timers).forEach(clearTimeout));

    function flash(key, duration, onExpire) {
        clearTimeout(timers[key]);
        timers[key] = setTimeout(onExpire, duration);
    }

    // Media query for desktop/mobile switch
    let mql;
    function handleMediaChange(e) {
        isDesktop = e.matches;
        // Close mobile UI when switching to desktop
        if (isDesktop) {
            fanOpen = false;
        }
    }

    onMount(() => {
        mql = window.matchMedia('(min-width: 481px)');
        isDesktop = mql.matches;
        mql.addEventListener('change', handleMediaChange);
    });

    onDestroy(() => {
        mql?.removeEventListener('change', handleMediaChange);
    });

    $: reconnecting = $connectionStatus === 'reconnecting';
    $: connectionFailed = $connectionStatus === 'failed';
    $: disabled = $multiplayerPlayerCount == null || reconnecting || connectionFailed;

    // Close mobile UI when toolbar becomes disabled
    $: if (disabled) {
        fanOpen = false;
    }

    // Derive aggregate animation activity indicator.
    // Priority: playing > countdown > joinable > gathering > available.
    function computeActivity(list) {
        const active = list.find(a => a.localInSession && a.sessionState >= 1);
        if (active && active.sessionState >= 2) return active.sessionState === 3 ? 'playing' : 'countdown';
        if (list.find(a => a.sessionState >= 1 && a.canJoin)) return 'joinable';
        if (active) return 'gathering';
        if (list.find(a => a.eligible && a.sessionState === 0)) return 'available';
        return null;
    }

    $: animActivity = computeActivity(anims);

    // First joinable animation for fast-join button
    $: firstJoinable = anims.find(a => a.sessionState >= 1 && a.canJoin && !a.localInSession) || null;
    $: animLocked = anims.some(a => (a.sessionState === 2 || a.sessionState === 3) && a.localInSession);
    $: showFastJoin = firstJoinable && !disabled && !animLocked;

    function handleFastJoin() {
        if (firstJoinable) {
            window.Module?._mp_set_anim_interest?.(firstJoinable.animIndex);
        }
    }

    // Badge pulse when player count changes
    $: {
        if (prevPlayerCount !== null && $multiplayerPlayerCount !== null && $multiplayerPlayerCount !== prevPlayerCount) {
            badgeBump = true;
            flash('badge', 400, () => { badgeBump = false; });
        }
        prevPlayerCount = $multiplayerPlayerCount;
    }

    $: settingsState = { thirdPersonCam: $thirdPersonEnabled, showNameBubbles: $showNameBubbles, allowCustomize: $allowCustomize };

    // Animation state derived from store
    $: anims = $animationState?.animations ?? [];
    $: animCurrentInterest = $animationState?.currentAnimIndex === 65535
        ? null : $animationState?.currentAnimIndex ?? null;
    $: animPendingInterest = $animationState?.pendingInterest ?? -1;
    $: animCluster = resolveCluster($animationState?.locations) || 'Island';
    $: clusterProgress = (() => {
        function calc(label) {
            const ids = ClusterAnimIndices.get(label);
            if (!ids) return { label, unlocked: 0, total: 0 };
            const total = ids.length;
            const unlocked = ids.filter(id => $memoryUnlocks.has(id)).length;
            return { label, unlocked, total };
        }
        return { scene: calc(animCluster), act: calc('Island') };
    })();

    // Browsers only synthesize `click` for the primary pointer.  When the user
    // is already walking (first finger on the canvas) a second touch creates a
    // non-primary pointer that gets pointerdown/pointerup but never click.
    // Synthesize the missing click so every <button> in the overlay responds.
    function handleMultiTouch(e) {
        if (e.isPrimary || e.pointerType !== 'touch') return;
        const btn = e.target.closest('button:not(:disabled)');
        if (btn) btn.click();
    }

    function refocusCanvas() {
        document.getElementById('canvas')?.focus();
    }

    function selectWalk(index) {
        selectedWalk = index;
        window.Module?._mp_set_walk_animation?.(walkOptions[index].id);
    }

    function selectIdle(index) {
        selectedIdle = index;
        window.Module?._mp_set_idle_animation?.(idleOptions[index].id);
    }

    function triggerEmote(index) {
        window.Module?._mp_trigger_emote?.(index);
        activeEmote = index;
        flash('emote', 300, () => { activeEmote = -1; });
    }

    function handleToggleInterest(animIndex) {
        if (animCurrentInterest === animIndex) {
            window.Module?._mp_cancel_anim_interest?.();
        } else {
            window.Module?._mp_set_anim_interest?.(animIndex);
        }
    }

    function showShareFeedback(msg) {
        shareFeedback = msg;
        flash('share', 2000, () => { shareFeedback = ''; });
    }

    async function handleShare() {
        const url = `${window.location.origin}${window.location.pathname}#r/${$multiplayerRoom}`;
        if (navigator.share && matchMedia('(pointer: coarse)').matches) {
            try {
                await navigator.share({ text: "Let's play LEGO Island together!", url });
                showShareFeedback('Shared!');
            } catch { /* user cancelled */ }
        } else {
            try {
                await navigator.clipboard.writeText(url);
                showShareFeedback('Link copied!');
            } catch { /* ignore */ }
        }
    }

    function handleFabClick() {
        if (disabled) return;
        fanOpen = !fanOpen;
        if (!fanOpen) refocusCanvas();
    }

</script>

{#if $gameRunning && $multiplayerRoom}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div use:keepVisible onpointerdown={handleMultiTouch}>
        {#if isDesktop}
            <!-- Desktop: hotbar always in DOM so it can animate in/out -->
            <MultiplayerHotbar
                visible={!disabled}
                {emoteOptions} {walkOptions} {idleOptions} {settingsItems} {settingsState}
                {selectedWalk} {selectedIdle} {activeEmote}
                playerCount={$multiplayerPlayerCount} {badgeBump} {shareFeedback}
                onEmote={triggerEmote} onSelectWalk={selectWalk} onSelectIdle={selectIdle}
                onShare={handleShare}
                animations={anims} {animCurrentInterest} {animPendingInterest}
                onToggleInterest={handleToggleInterest}
                {animActivity}
                animsDisabled={!$thirdPersonEnabled}
                canFastJoin={showFastJoin}
                onFastJoin={handleFastJoin}
                {clusterProgress} />

            <!-- Minimal badge when hotbar is disabled -->
            {#if disabled}
                <div class="desktop-badge" class:bump={badgeBump} class:reconnecting class:failed={connectionFailed}>
                    {#if reconnecting}
                        <span class="status-dot pulse"></span>
                        <span class="status-text">Reconnecting</span>
                    {:else if connectionFailed}
                        <span class="status-dot failed"></span>
                        <span class="status-text">Disconnected</span>
                    {:else}
                        <PeopleIcon />
                        {#if $multiplayerPlayerCount != null}
                            {$multiplayerPlayerCount}
                        {/if}
                    {/if}
                </div>
            {/if}
        {:else}
            <!-- Mobile: FAB stays visible; highlights when fan is open -->
            <MultiplayerFab
                playerCount={$multiplayerPlayerCount} {badgeBump} {disabled}
                {reconnecting} {connectionFailed}
                active={fanOpen}
                onclick={handleFabClick}
                canFastJoin={showFastJoin}
                onFastJoin={handleFastJoin} />

            {#if !disabled}
                <EmoteFan
                    visible={fanOpen}
                    {emoteOptions} {activeEmote}
                    {walkOptions} {idleOptions} {settingsItems} {settingsState}
                    {selectedWalk} {selectedIdle} {shareFeedback}
                    onSelectWalk={selectWalk} onSelectIdle={selectIdle}
                    onShare={handleShare}
                    onEmote={triggerEmote}
                    {animActivity}
                    animations={anims} {animCurrentInterest} {animPendingInterest}
                    onToggleInterest={handleToggleInterest}
                    animsDisabled={!$thirdPersonEnabled}
                    {clusterProgress} />
            {/if}
        {/if}
        <CountdownOverlay animations={anims} />
    </div>
{/if}

<style>
    .desktop-badge {
        position: fixed;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        background: rgba(24, 24, 24, 0.85);
        border: 1px solid var(--color-border-medium);
        border-radius: 20px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: var(--color-text-muted);
        font-size: 12px;
        font-weight: 700;
        font-family: Arial, sans-serif;
        user-select: none;
        opacity: 0.6;
    }

    .desktop-badge.bump {
        animation: badge-bump 0.4s ease;
    }

    .desktop-badge.reconnecting {
        border-color: rgba(255, 165, 0, 0.5);
        opacity: 1;
    }

    .desktop-badge.failed {
        border-color: rgba(255, 107, 107, 0.5);
        opacity: 1;
    }

    .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .status-dot.pulse {
        background: #ffa500;
        animation: status-pulse 1.5s ease-in-out infinite;
    }

    .status-dot.failed {
        background: #ff6b6b;
    }

    .status-text {
        font-size: 11px;
        font-weight: 600;
    }

    .desktop-badge.reconnecting .status-text {
        color: #ffa500;
    }

    .desktop-badge.failed .status-text {
        color: #ff6b6b;
    }

    @keyframes badge-bump {
        0% { transform: translateX(-50%) scale(1); }
        40% { transform: translateX(-50%) scale(1.2); }
        100% { transform: translateX(-50%) scale(1); }
    }

    @keyframes status-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }
</style>
