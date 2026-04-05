<script>
    import { onDestroy } from 'svelte';
    import { currentPage, scenePlayerEventId, scenePlayerData, memoryCompletions } from '../stores.js';
    import { AnimationTitles, AnimationObjectIds } from './multiplayer/animationCatalog.js';
    import { ActorDisplayNames } from '../core/savegame/actorConstants.js';
    import { navigateTo, encodeSceneData, formatDateTime } from '../core/navigation.js';
    import { API_URL } from '../core/config.js';
    import { getWdb } from '../core/wdbCache.js';
    import { getSIReader, decodeAnimIndex } from '../core/formats/SIParser.js';
    import { parseComposite } from '../core/formats/SICompositeParser.js';
    import { ScenePlayerRenderer } from '../core/rendering/ScenePlayerRenderer.js';
    import { SceneAudioPlayer } from '../core/sceneAudio.js';
    import { PhonemePlayer } from '../core/rendering/PhonemePlayer.js';
    import BackButton from './BackButton.svelte';
    import ShareLinkButton from './ShareLinkButton.svelte';

    let loading = true;
    let error = null;
    let animIndex = null;
    let participants = [];
    let title = '';
    let sceneLanguage = 'en';
    let sceneTimestamp = null;
    let loadedFromServer = false;

    // Playback state
    let renderer = null;
    let audioPlayer = null;
    let phonemePlayer = null;
    let playing = false;
    let elapsed = 0;
    let duration = 0;
    let muted = false;
    let ready = false;
    let canvasEl;
    let progressBarEl;
    let tickRaf = null;
    let loadGeneration = 0; // guard against stale async callbacks
    let seeking = false;
    let wasPlayingBeforeSeek = false;
    let audioBlocked = false;

    $: if ($currentPage === 'scene-player') {
        startLoad();
    }

    $: if ($currentPage !== 'scene-player') {
        cleanup();
    }

    onDestroy(cleanup);

    function updateMetaUrls(url) {
        document.querySelector('link[rel="canonical"]')?.setAttribute('href', url);
        document.querySelector('meta[property="og:url"]')?.setAttribute('content', url);
        document.querySelector('meta[name="twitter:url"]')?.setAttribute('content', url);
    }

    function cleanup() {
        loadGeneration++;
        if (tickRaf) { cancelAnimationFrame(tickRaf); tickRaf = null; }
        phonemePlayer?.dispose();
        audioPlayer?.dispose();
        if (renderer) {
            renderer.animating = false;
            renderer.dispose();
        }
        renderer = null;
        audioPlayer = null;
        phonemePlayer = null;
        playing = false;
        ready = false;
        elapsed = 0;
        duration = 0;
        sceneLanguage = 'en';
        sceneTimestamp = null;
        loadedFromServer = false;
        audioBlocked = false;
        updateMetaUrls(window.location.origin + '/');
    }

    function startLoad() {
        // Guard: don't load if we have no scene data yet (stores may not be set)
        if (!$scenePlayerEventId && !$scenePlayerData) return;
        loadScene();
    }

    async function loadScene() {
        cleanup();
        const gen = ++loadGeneration;
        loading = true;
        error = null;
        animIndex = null;
        participants = [];
        title = '';

        try {
            // Step 1: Resolve the completion record
            let record = null;

            loadedFromServer = false;
            if ($scenePlayerData) {
                // Support both long keys (legacy) and short keys (new compact format)
                const d = $scenePlayerData;
                const rawParts = d.participants ?? d.p ?? [];
                record = {
                    animIndex: d.animIndex ?? d.a,
                    participants: rawParts.map(p => ({
                        displayName: p.displayName ?? p.n,
                        charIndex: p.charIndex ?? p.c
                    })),
                    language: d.language ?? d.l,
                    t: d.t
                };
            } else if ($scenePlayerEventId) {
                const local = ($memoryCompletions || []).find(c => c.eventId === $scenePlayerEventId);
                if (local) {
                    record = { animIndex: local.animIndex, participants: local.participants, language: local.language, t: local.t };
                } else {
                    const res = await fetch(`${API_URL}/api/memory/${encodeURIComponent($scenePlayerEventId)}`);
                    if (gen !== loadGeneration) return;
                    if (res.ok) {
                        const data = await res.json();
                        record = { animIndex: data.animIndex, participants: data.participants, language: data.language, t: data.completedAt };
                        loadedFromServer = true;
                    }
                }
            }

            if (!record || record.animIndex == null) {
                error = 'Memory not found';
                loading = false;
                return;
            }

            animIndex = record.animIndex;
            participants = record.participants || [];
            sceneLanguage = record.language || record.l || 'en';
            sceneTimestamp = record.t || null;
            const language = sceneLanguage;
            title = AnimationTitles[animIndex] || `Animation #${animIndex}`;

            // Step 2: Derive world slot and objectId
            const { worldSlot } = decodeAnimIndex(animIndex);
            const objectId = AnimationObjectIds[animIndex];
            if (objectId == null) {
                error = 'Unknown animation';
                loading = false;
                return;
            }

            // Step 3: Load SI and WDB in parallel
            const [siReader, wdbData] = await Promise.all([
                getSIReader(worldSlot, language),
                getWdb(),
            ]);
            if (gen !== loadGeneration) return;

            // Step 4: Read the composite object from SI
            const siObject = await siReader.readObjectWithData(objectId);
            if (gen !== loadGeneration) return;
            if (!siObject) {
                error = 'Animation data not found in SI file';
                loading = false;
                return;
            }

            // Step 5: Parse into SceneAnimData
            const sceneData = parseComposite(siObject);
            if (!sceneData) {
                error = 'Failed to parse animation data';
                loading = false;
                return;
            }

            duration = sceneData.duration;

            // Step 6: Wait for canvas layout (loading stays true to keep overlay visible)
            ready = false;

            await new Promise(r => requestAnimationFrame(r));
            await new Promise(r => requestAnimationFrame(r));
            if (gen !== loadGeneration || !canvasEl) return;

            // Step 7: Initialize renderer
            renderer = new ScenePlayerRenderer(canvasEl);
            renderer.loadScene(sceneData, participants, wdbData);

            // Step 8: Initialize audio
            audioPlayer = new SceneAudioPlayer();
            await audioPlayer.init(sceneData.audioTracks);
            if (gen !== loadGeneration) return;

            // Extend duration if audio extends beyond animation
            const audioEnd = audioPlayer.maxEndTime;
            if (audioEnd > duration) {
                duration = audioEnd;
                renderer.duration = duration;
            }

            // Step 9: Initialize phoneme player
            phonemePlayer = new PhonemePlayer();
            phonemePlayer.init(sceneData.phonemeTracks, renderer.actorContainers, renderer.gl);

            ready = true;

            // Step 10: Check if audio is allowed, then auto-play or show overlay
            // Don't call resume() here — without a user gesture the promise hangs.
            // AudioContext.state is 'running' when autoplay is allowed, 'suspended' when blocked.
            loading = false;
            if (audioPlayer.canAutoplay) {
                doPlay();
            } else {
                audioPlayer.blocked = true;
                audioBlocked = true;
            }

        } catch (e) {
            console.error('[ScenePlayer] Load failed:', e);
            if (gen === loadGeneration) {
                error = e.message || 'Failed to load scene';
                loading = false;
            }
        }
    }

    async function doPlay() {
        if (!renderer) return;
        playing = true;
        elapsed = 0;
        renderer.resetPlayback();
        renderer.play();
        await audioPlayer?.resume();
        startTick();
    }

    function handleOverlayClick() {
        audioBlocked = false;
        doPlay();
    }

    function togglePlay() {
        if (!renderer) return;

        if (playing) {
            playing = false;
            renderer.pause();
            audioPlayer?.pause();
        } else {
            // If finished, restart from beginning
            if (renderer.finished) {
                renderer.resetPlayback();
                elapsed = 0;
                audioPlayer?.stop();
                phonemePlayer?.stop();
            }
            playing = true;
            renderer.play();
            audioPlayer?.resume();
            startTick();
        }
    }

    function startTick() {
        if (tickRaf) return;
        const tick = () => {
            if (!renderer) { tickRaf = null; return; }

            elapsed = renderer.elapsed;

            if (playing) {
                audioPlayer?.tick(elapsed);
                phonemePlayer?.tick(elapsed);

                if (renderer.finished) {
                    playing = false;
                    phonemePlayer?.stop();
                    audioPlayer?.stop();
                }
            }

            tickRaf = requestAnimationFrame(tick);
        };
        tickRaf = requestAnimationFrame(tick);
    }

    function onProgressPointerDown(e) {
        if (!renderer || !ready) return;
        e.preventDefault();

        seeking = true;
        wasPlayingBeforeSeek = playing;

        if (playing) {
            playing = false;
            renderer.pause();
        }
        audioPlayer?.pause();

        seekToPosition(e);
        progressBarEl.setPointerCapture(e.pointerId);
    }

    function onProgressPointerMove(e) {
        if (!seeking) return;
        seekToPosition(e);
    }

    function onProgressPointerUp(e) {
        if (!seeking) return;
        seeking = false;

        seekToPosition(e);
        audioPlayer?.seek(elapsed);

        if (wasPlayingBeforeSeek && !renderer.finished) {
            playing = true;
            renderer.play();
            audioPlayer?.resume();
            startTick();
        }
    }

    function seekToPosition(e) {
        const rect = progressBarEl.getBoundingClientRect();
        const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const seekTime = fraction * duration;

        renderer.seek(seekTime);
        phonemePlayer?.seek(seekTime);
        elapsed = seekTime;
    }

    function toggleMute() {
        muted = !muted;
        if (audioPlayer) audioPlayer.muted = muted;
    }

    function formatTime(ms) {
        const s = Math.floor(Math.max(0, ms) / 1000);
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    }

    // Is this memory confirmed available on the server?
    $: serverAvailable = loadedFromServer ||
        (!!$scenePlayerEventId && ($memoryCompletions || []).some(
            c => c.eventId === $scenePlayerEventId && c.synced
        ));

    $: shareUrl = animIndex != null
        ? (serverAvailable && $scenePlayerEventId
            ? `${window.location.origin}/memory/${$scenePlayerEventId}`
            : `${window.location.origin}/scene/${encodeSceneData(animIndex, participants, sceneLanguage, sceneTimestamp)}`)
        : null;

    // Keep URL bar in sync with the shareable URL
    $: if ($currentPage === 'scene-player' && shareUrl && !loading) {
        const targetPath = new URL(shareUrl).pathname;
        if (window.location.pathname !== targetPath) {
            const newState = { page: 'scene-player', fromApp: history.state?.fromApp };
            if (serverAvailable && $scenePlayerEventId) {
                newState.eventId = $scenePlayerEventId;
            } else {
                newState.sceneData = encodeSceneData(animIndex, participants, sceneLanguage, sceneTimestamp);
            }
            history.replaceState(newState, '', targetPath);
        }
    }

    // Keep canonical / OG meta in sync so native share uses the correct URL
    $: if (shareUrl) {
        updateMetaUrls(shareUrl);
    }
</script>

<div class="page-content">
    <BackButton />
    <div class="page-inner-content scene-player-inner">
    {#if !error}
    <div class="scene-title-area">
        <h2 class="scene-title">{title || '\u00A0'}</h2>
        <div class="scene-participants">
            {#if participants.length > 0}
                {#each participants as p, idx}
                    {#if idx > 0}<span class="sep">&middot;</span>{/if}
                    <span class="participant">{p.displayName}
                        <span class="char-name">as {ActorDisplayNames[p.charIndex] || `#${p.charIndex}`}</span>
                    </span>
                {/each}
                {#if sceneTimestamp}
                    <span class="sep">&middot;</span>
                    <span class="scene-timestamp">{formatDateTime(sceneTimestamp)}</span>
                {/if}
            {:else}
                &nbsp;
            {/if}
        </div>
    </div>
    {/if}

    <div class="scene-canvas-area" class:has-error={error}>
        {#if error}
            <div class="scene-error">
                <img src="images/callfail.webp" alt="" class="scene-error-image" />
                <p class="scene-error-title">{error}</p>
                <p class="scene-error-message">This memory may have been deleted or the link could be invalid. Try browsing existing memories or create new ones by playing with others!</p>
                <a href="#memories" class="scene-error-back" onclick={e => { e.preventDefault(); navigateTo('memories'); }}>Back to Memories</a>
            </div>
        {:else if $currentPage === 'scene-player'}
            <canvas bind:this={canvasEl} class="scene-canvas" class:dimmed={loading || audioBlocked}></canvas>
            {#if loading || audioBlocked}
                <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
                <div class="scene-overlay" onclick={audioBlocked ? handleOverlayClick : undefined}
                     class:clickable={audioBlocked}>
                    {#if audioBlocked}
                        <div class="play-overlay-btn">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" style="margin-left: 3px"><polygon points="5,3 19,12 5,21"/></svg>
                        </div>
                    {:else}
                        <div class="spinner"></div>
                    {/if}
                </div>
            {/if}
        {/if}
    </div>

    {#if !error}
    <div class="scene-controls" class:disabled={!ready || audioBlocked}>
        <button class="ctrl-btn" onclick={togglePlay} title={playing ? 'Pause' : 'Play'}>
            {#if playing}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
            {/if}
        </button>

        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="progress-bar" class:seeking bind:this={progressBarEl}
             onpointerdown={onProgressPointerDown}
             onpointermove={onProgressPointerMove}
             onpointerup={onProgressPointerUp}>
            <div class="progress-fill" style="width: {duration > 0 ? Math.min(elapsed / duration * 100, 100) : 0}%"></div>
        </div>

        <span class="time-display">{formatTime(elapsed)} / {formatTime(duration)}</span>

        <button class="ctrl-btn" onclick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
            {#if muted}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
            {:else}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="currentColor"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
            {/if}
        </button>

        {#if shareUrl}
            <span class="controls-spacer"></span>
            <ShareLinkButton url={shareUrl} />
        {/if}
    </div>
    {/if}
    </div>
</div>

<style>
    .scene-player-inner {
        text-align: left;
    }

    .scene-title-area {
        margin-bottom: 1rem;
    }

    .scene-title {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 0;
        color: #e0e0e0;
        line-height: 1.3;
    }

    .scene-participants {
        font-size: 0.8rem;
        color: #999;
        margin-top: 0.25rem;
    }

    .scene-participants .sep {
        margin: 0 0.3em;
    }

    .scene-participants .char-name {
        color: #777;
        font-style: italic;
    }

    .scene-timestamp {
        color: #777;
    }

    .scene-canvas-area {
        position: relative;
        width: 100%;
        aspect-ratio: 16 / 9;
        background: #111;
        border-radius: 8px;
        overflow: hidden;
    }

    .scene-canvas-area.has-error {
        aspect-ratio: auto;
        overflow: visible;
    }

    .scene-canvas {
        width: 100%;
        height: 100%;
        display: block;
    }

    .scene-canvas.dimmed {
        opacity: 0.3;
    }

    .scene-overlay {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2;
    }

    .scene-overlay.clickable {
        cursor: pointer;
    }

    .play-overlay-btn {
        width: 68px;
        height: 68px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.12);
        border: 2px solid rgba(255, 255, 255, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        color: rgba(255, 255, 255, 0.85);
        transition: all 0.2s ease;
        backdrop-filter: blur(4px);
    }

    .scene-overlay.clickable:hover .play-overlay-btn {
        background: rgba(255, 255, 255, 0.2);
        border-color: rgba(255, 255, 255, 0.4);
        color: #fff;
        transform: scale(1.08);
    }

    .scene-overlay.clickable:active .play-overlay-btn {
        transform: scale(0.95);
    }

    .scene-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 40px 24px;
    }

    .scene-error-image {
        width: 80px;
        height: auto;
        border-radius: 10px;
        border: 2px solid var(--color-border-medium);
        box-shadow: var(--shadow-md);
        margin-bottom: 16px;
    }

    .scene-error-title {
        color: #ff6b6b;
        font-size: 1.1em;
        font-weight: bold;
        margin: 0 0 8px 0;
    }

    .scene-error-message {
        color: var(--color-text-muted);
        font-size: 0.85em;
        line-height: 1.5;
        margin: 0 0 20px 0;
        max-width: 320px;
    }

    .scene-error-back {
        display: inline-block;
        padding: 10px 24px;
        background-color: var(--color-primary);
        color: #000;
        border-radius: 8px;
        font-size: 0.9em;
        font-weight: bold;
        text-decoration: none;
        transition: all 0.2s ease;
        box-shadow: 0 2px 8px rgba(255, 215, 0, 0.25);
    }

    .scene-error-back:hover {
        background-color: #fff;
        transform: scale(1.02);
        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.2);
        text-decoration: none;
    }

    .scene-error-back:active {
        transform: scale(0.98);
    }

    .spinner {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background:
            radial-gradient(transparent 55%, transparent 56%),
            conic-gradient(var(--color-primary, #FFD700) 0deg 90deg, var(--color-border-dark, #333) 90deg 360deg);
        animation: spin 1s linear infinite;
    }

    .scene-controls {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.5rem 0.75rem;
        background: #1a1a1a;
        border-radius: 8px;
    }

    .scene-controls.disabled {
        opacity: 0.35;
        pointer-events: none;
    }

    .ctrl-btn {
        background: none;
        border: none;
        color: #ccc;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background 0.15s;
    }

    .ctrl-btn:hover {
        background: #333;
        color: #fff;
    }

    .progress-bar {
        flex: 1;
        height: 6px;
        background: #333;
        border-radius: 3px;
        overflow: hidden;
        cursor: pointer;
        padding: 6px 0;
        background-clip: content-box;
        touch-action: none;
    }

    .progress-fill {
        height: 100%;
        background: #6af;
        border-radius: 3px;
        transition: width 0.1s linear;
    }

    .progress-bar.seeking .progress-fill {
        transition: none;
    }

    .time-display {
        font-size: 0.75rem;
        color: #888;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
        min-width: 5em;
        text-align: center;
    }

    .controls-spacer {
        flex: 0 0 1px;
        height: 16px;
        background: #333;
        margin: 0 0.25rem;
    }
</style>
