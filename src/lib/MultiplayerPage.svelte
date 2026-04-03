<script>
    import { onMount, onDestroy } from 'svelte';
    import { flip } from 'svelte/animate';
    import BackButton from './BackButton.svelte';
    import OpfsDisabledBanner from './OpfsDisabledBanner.svelte';
    import PanningImage from './PanningImage.svelte';
    import ActorPicker from './ActorPicker.svelte';
    import { multiplayerRoom, currentPage, gameRunning, opfsDisabled } from '../stores.js';
    import { navigateToRoom } from '../core/navigation.js';
    import { generateRoomName } from '../core/room-names.js';
    import { launchGame } from '../core/emscripten.js';
    import { saveConfigFromDOM, getOpfsRoot } from '../core/opfs.js';
    import { showToast } from '../core/toast.js';
    import { ActorInfoInit } from '../core/savegame/actorConstants.js';
    import ShareLinkButton from './ShareLinkButton.svelte';

    const RELAY_URL = __RELAY_URL__;
    const RELAY_HTTP = RELAY_URL.replace('wss://', 'https://').replace('ws://', 'http://');

    const maxPlayers = 16;
    let creating = false;
    let isPrivate = false;

    let selectedActorIndex = Number(sessionStorage.getItem('mp-actor')) || 0;

    // Room lobby state
    let playerCount = 0;
    let roomMaxPlayers = 0;
    let roomFull = false;
    let previewLoading = false;
    let previewError = null;
    let pollInterval = null;

    let fetching = false;
    let lastPolledRoom = null;

    // Server browser state
    const BROWSER_ROWS = 5;
    const placeholderMessages = [
        'It\'s one pretty island.',
        'It\'s a lovely day for a bike ride.',
        'I\'m about to pop a brick!',
        'The fun is in the doing, not the winning.',
        'Come on back sometime and build on that.',
    ];
    let publicRooms = [];
    let browserFetching = false;
    let browserPollInterval = null;
    let browserInitialized = false;
    let showBrowserRows = false;
    let browserGraceTimeout = setTimeout(() => { showBrowserRows = true; }, 300);

    // Check if we were reloaded after a room-full rejection
    {
        if (sessionStorage.getItem('mp-rejected')) {
            sessionStorage.removeItem('mp-rejected');
            setTimeout(() => showToast('Island is full', { error: true, duration: 3000 }), 0);
        }
    }

    onMount(async () => {
        const root = await getOpfsRoot();
        if (!root) {
            opfsDisabled.set(true);
        }
    });

    $: roomName = $multiplayerRoom;
    $: hasRoom = roomName !== null && roomName !== '';
    $: browserRows = (() => {
        const rows = publicRooms.map(r => ({ ...r, id: r.roomId, placeholder: false }));
        for (let i = rows.length; i < BROWSER_ROWS; i++) {
            rows.push({ id: `_empty_${i}`, placeholder: true, message: placeholderMessages[i] });
        }
        return rows;
    })();

    // Poll room preview when room is active
    $: {
        const shouldPoll = hasRoom && $currentPage === 'multiplayer' && !$gameRunning;
        const roomChanged = roomName !== lastPolledRoom;

        if (shouldPoll && (roomChanged || !pollInterval)) {
            lastPolledRoom = roomName;
            startPolling();
        } else if (!shouldPoll) {
            lastPolledRoom = null;
            stopPolling();
        }
    }

    function startPolling() {
        stopPolling();
        fetchPreview();
        pollInterval = setInterval(fetchPreview, 5000);
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    // Poll public rooms when no room is active
    $: {
        const shouldPollBrowser = !hasRoom && $currentPage === 'multiplayer' && !$gameRunning;
        if (shouldPollBrowser && !browserPollInterval) {
            fetchPublicRooms();
            browserPollInterval = setInterval(fetchPublicRooms, 3000);
        } else if (!shouldPollBrowser && browserPollInterval) {
            clearInterval(browserPollInterval);
            browserPollInterval = null;
        }
    }

    async function fetchPublicRooms() {
        if (browserFetching) return;
        browserFetching = true;
        try {
            const res = await fetch(`${RELAY_HTTP}/rooms`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            publicRooms = data.rooms;
        } catch {
            // Silently fail — browser is optional
        } finally {
            browserInitialized = true;
            clearTimeout(browserGraceTimeout);
            showBrowserRows = true;
            browserFetching = false;
        }
    }

    async function fetchPreview() {
        if (!roomName || fetching) return;
        fetching = true;
        previewLoading = playerCount === 0 && roomMaxPlayers === 0;
        previewError = null;

        try {
            const res = await fetch(`${RELAY_HTTP}/room/${roomName}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            playerCount = data.players;
            roomMaxPlayers = data.maxPlayers;
            roomFull = playerCount >= roomMaxPlayers;
        } catch {
            previewError = 'Could not reach relay server';
        } finally {
            previewLoading = false;
            fetching = false;
        }
    }

    async function handleCreateRoom() {
        creating = true;
        const name = generateRoomName();

        try {
            await fetch(`${RELAY_HTTP}/room/${name}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ maxPlayers, isPublic: !isPrivate })
            });

            navigateToRoom(name);
        } catch {
            previewError = 'Could not reach relay server';
        } finally {
            creating = false;
        }
    }

    async function handleRunGame() {
        if (!roomName) return;
        const actorName = ActorInfoInit[selectedActorIndex].name;
        await saveConfigFromDOM({ room: roomName, relayUrl: RELAY_URL, actor: actorName });
        launchGame();
    }

    $: roomShareUrl = `${window.location.origin}${window.location.pathname}#r/${roomName}`;

    onDestroy(() => {
        stopPolling();
        clearTimeout(browserGraceTimeout);
        if (browserPollInterval) {
            clearInterval(browserPollInterval);
            browserPollInterval = null;
        }
    });
</script>

<div id="multiplayer-page" class="page-content">
    <BackButton />
    <OpfsDisabledBanner />
    <div class="page-inner-content config-layout">
        <div class="config-art-panel">
            <PanningImage src="images/multi.webp" alt="LEGO Island Multiplayer" duration={45} />
        </div>
        <div class="config-main">
            <h2 class="mp-title">Multiplayer
                <span class="mp-badge">
                    <svg class="mp-badge-icon" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 3L12 14L15 3"/><path d="M6 3H18"/><path d="M5 21H19L17 8H7L5 21Z"/>
                    </svg>
                    Experimental
                </span>
            </h2>

            <p class="mp-description">Explore LEGO Island together with other players. Create an island and share the link to get started.</p>

            {#if !hasRoom}
                <div class="mp-panel">
                    <div class="mp-action-bar">
                        <button class="preset-btn mp-create-main" onclick={handleCreateRoom} disabled={creating || $opfsDisabled}>
                            {#if isPrivate}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            {:else}
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                </svg>
                            {/if}
                            {creating ? 'Creating...' : isPrivate ? 'Create Private Island' : 'Create Public Island'}
                        </button>
                        <button class="preset-btn mp-create-toggle" onclick={() => { isPrivate = !isPrivate; }} disabled={creating || $opfsDisabled} title={isPrivate ? 'Switch to public (listed in browser)' : 'Switch to private (link only)'}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mp-chevron" class:mp-chevron-up={isPrivate}>
                                <polyline points="6 9 12 15 18 9"/>
                            </svg>
                        </button>
                    </div>

                    <div class="mp-browser-section">
                        <div class="mp-browser-header">
                            <span class="mp-browser-title">
                                {#if !browserInitialized}
                                    <span class="mp-browser-spinner"></span>
                                {:else}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                                    </svg>
                                {/if}
                                Public Islands
                            </span>
                            {#if publicRooms.length > 0}
                                <span class="mp-browser-count">{publicRooms.length >= BROWSER_ROWS ? `${BROWSER_ROWS}+` : publicRooms.length} available</span>
                            {/if}
                        </div>
                        <div class="mp-browser-list" class:mp-browser-hidden={!showBrowserRows}>
                            {#each browserRows as row (row.id)}
                                <!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
                                <div class="mp-browser-room" class:mp-browser-placeholder={row.placeholder} animate:flip={{ duration: 250 }} onclick={() => !row.placeholder && navigateToRoom(row.roomId)}>
                                    {#if row.placeholder}
                                        <span class="mp-placeholder-text">{row.message}</span>
                                    {:else}
                                        <span class="mp-browser-room-name">{row.roomId}</span>
                                        <span class="mp-browser-room-players">
                                            <span class="mp-player-bar-wrap">
                                                <span class="mp-player-bar" style="width: {row.maxPlayers > 0 ? (row.players / row.maxPlayers * 100) : 0}%"></span>
                                            </span>
                                            <span class="mp-player-count"><span class="mp-count-num">{row.players}</span>/<span class="mp-count-num">{row.maxPlayers}</span></span>
                                        </span>
                                    {/if}
                                </div>
                            {/each}
                        </div>
                    </div>
                </div>

                <div class="mp-feature-grid">
                    <div class="mp-feature">
                        <div class="mp-feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                            </svg>
                        </div>
                        <div class="mp-feature-text">
                            <strong>Third-person camera</strong>
                            <span>Toggle a camera behind your character to see yourself walking and performing emotes.</span>
                        </div>
                    </div>
                    <div class="mp-feature">
                        <div class="mp-feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/><line x1="17" y1="17" x2="22" y2="17"/>
                            </svg>
                        </div>
                        <div class="mp-feature-text">
                            <strong><a href="#memories" class="mp-feature-link">Nick Brick's Memories</a></strong>
                            <span>Trigger 300+ original animations together. Fill actor roles and watch scenes play out.</span>
                        </div>
                    </div>
                    <div class="mp-feature">
                        <div class="mp-feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <div class="mp-feature-text">
                            <strong>Emotes and interactions</strong>
                            <span>Wave, tip your hat, cycle colors and moods, and pick different walk and idle styles.</span>
                        </div>
                    </div>
                    <div class="mp-feature">
                        <div class="mp-feature-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                            </svg>
                        </div>
                        <div class="mp-feature-text">
                            <strong>Shared world*</strong>
                            <span>See other players on the island. Plants, buildings, and their states are synchronized.</span>
                        </div>
                    </div>
                </div>
                <p class="mp-footer-note">*Missions, vehicles, and other game systems are not shared between players.</p>
            {:else}
                <div class="mp-section">
                    <div class="mp-room-bar">
                        <span class="mp-room-bar-info">
                            <span class="mp-room-name">{roomName}</span>
                            <span class="mp-room-sep">&middot;</span>
                            <span class="mp-room-players">
                                {#if previewLoading}
                                    ...
                                {:else if previewError}
                                    <span class="mp-error">{previewError}</span>
                                {:else}
                                    <span class="mp-player-bar-wrap">
                                        <span class="mp-player-bar" style="width: {roomMaxPlayers > 0 ? (playerCount / roomMaxPlayers * 100) : 0}%"></span>
                                    </span>
                                    <span class="mp-player-count">{playerCount}/{roomMaxPlayers}</span>
                                {/if}
                            </span>
                        </span>
                        <ShareLinkButton url={roomShareUrl} shareText="Let's play LEGO Island together!" compact />
                    </div>

                    {#if !$gameRunning}
                        <ActorPicker
                            selectedIndex={selectedActorIndex}
                            onSelect={(idx) => { selectedActorIndex = idx; sessionStorage.setItem('mp-actor', idx); }}
                        />
                    {/if}

                    {#if roomFull}
                        <p class="mp-full-msg">Island is full. Wait for a player to leave or create a new island.</p>
                    {:else}
                        <button class="preset-btn mp-run-btn" onclick={handleRunGame} disabled={$opfsDisabled}>Run Game</button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .mp-title {
        color: var(--color-text-light);
        font-size: 1.05em;
        margin: 0 0 6px 0;
    }

    .mp-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        font-size: 0.55em;
        font-weight: bold;
        text-transform: uppercase;
        padding: 2px 6px;
        border-radius: 4px;
        background: var(--color-primary);
        color: #000;
        vertical-align: middle;
        margin-left: 4px;
    }

    .mp-badge-icon {
        flex-shrink: 0;
    }

    .mp-description {
        color: var(--color-text-medium);
        font-size: 0.8em;
        line-height: 1.5;
        margin: 0 0 10px 0;
    }

    /* Unified panel for no-room state */
    .mp-panel {
        background: var(--gradient-panel);
        border: 1px solid var(--color-bg-panel);
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }

    .mp-action-bar {
        display: flex;
        padding: 12px;
        border-bottom: 1px solid var(--color-border-dark);
    }

    .mp-create-main,
    .mp-create-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        border-color: var(--color-primary);
        color: var(--color-primary);
    }

    .mp-create-main {
        flex: 1;
        gap: 6px;
        border-radius: 6px 0 0 6px;
        border-right: none;
    }

    .mp-create-toggle {
        flex: 0 0 36px;
        width: 36px;
        border-radius: 0 6px 6px 0;
        border-left: 1px solid var(--color-border-dark);
    }

    .mp-chevron {
        transition: transform 0.2s ease;
    }

    .mp-chevron-up {
        transform: rotate(180deg);
    }

    /* Shared section card for lobby */
    .mp-section {
        background: var(--gradient-panel);
        border: 1px solid var(--color-bg-panel);
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    /* Room info bar */
    .mp-room-bar {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 6px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 6px 10px;
    }

    .mp-room-bar-info {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
    }

    .mp-room-name {
        font-weight: bold;
        font-size: 0.85em;
        color: var(--color-primary);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .mp-room-sep {
        color: var(--color-text-muted);
        font-size: 0.75em;
    }

    .mp-room-players {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75em;
        white-space: nowrap;
    }

    .mp-player-bar-wrap {
        width: 36px;
        height: 6px;
        border-radius: 3px;
        background: var(--color-border-medium);
        overflow: hidden;
    }

    .mp-player-bar {
        display: block;
        height: 100%;
        border-radius: 3px;
        background: var(--color-primary);
        transition: width 0.3s ease;
    }

    .mp-player-count {
        color: var(--color-text-muted);
        display: inline-flex;
        justify-content: flex-end;
        min-width: 38px;
    }

    .mp-count-num {
        display: inline-block;
        min-width: 14px;
        text-align: right;
    }

    .mp-error {
        color: #ff6b6b;
    }

    .mp-run-btn {
        width: 100%;
    }

    .mp-full-msg {
        color: var(--color-text-muted);
        font-size: 0.75em;
        margin: 0;
        text-align: center;
    }

    /* Features grid */
    .mp-feature-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
        margin-top: 9px;
    }

    .mp-feature {
        display: flex;
        gap: 8px;
        padding: 9px;
        background: var(--gradient-panel);
        border: 1px solid var(--color-bg-panel);
        border-radius: 8px;
    }

    .mp-feature-icon {
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        background: rgba(255, 215, 0, 0.1);
        color: var(--color-primary);
    }

    .mp-feature-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
    }

    .mp-feature-text strong {
        color: var(--color-text-light);
        font-size: 0.7em;
    }

    .mp-feature-link {
        color: var(--color-primary);
        text-decoration: none;
    }

    .mp-feature-link:hover {
        text-decoration: underline;
    }

    .mp-feature-text span {
        color: var(--color-text-muted);
        font-size: 0.65em;
        line-height: 1.35;
    }

    .mp-footer-note {
        color: var(--color-text-muted);
        font-size: 0.65em;
        text-align: center;
        margin: 6px 0 0 0;
        opacity: 0.7;
    }

    /* Server browser */
    .mp-browser-section {
        display: flex;
        flex-direction: column;
    }

    .mp-browser-spinner {
        width: 12px;
        height: 12px;
        box-sizing: border-box;
        border-radius: 50%;
        border: 2px solid var(--color-border-dark);
        border-top-color: var(--color-primary);
        animation: spin 0.6s linear infinite;
    }

    .mp-browser-room:not(.mp-browser-placeholder) {
        animation: mp-room-enter 0.25s ease both;
    }

    @keyframes mp-room-enter {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .mp-browser-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-border-dark);
    }

    .mp-browser-title {
        display: flex;
        align-items: center;
        gap: 5px;
        color: var(--color-text-light);
        font-size: 0.75em;
        font-weight: bold;
    }

    .mp-browser-count {
        color: var(--color-text-muted);
        font-size: 0.7em;
    }

    .mp-browser-list {
        scrollbar-width: thin;
        scrollbar-color: var(--color-border-medium) transparent;
    }

    .mp-browser-hidden {
        visibility: hidden;
    }

    .mp-browser-list::-webkit-scrollbar {
        width: 4px;
    }

    .mp-browser-list::-webkit-scrollbar-track {
        background: transparent;
    }

    .mp-browser-list::-webkit-scrollbar-thumb {
        background: var(--color-border-medium);
        border-radius: 2px;
    }

    .mp-browser-room {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 7px 12px;
        border-bottom: 1px solid var(--color-surface-subtle);
        color: var(--color-text-medium);
        cursor: pointer;
        font-size: 0.75em;
        transition: background 0.15s ease;
        overflow: hidden;
    }

    .mp-browser-room:not(.mp-browser-placeholder):hover {
        background: var(--color-surface-hover);
    }

    .mp-browser-room:last-child {
        border-bottom: none;
    }

    .mp-browser-room-name {
        color: var(--color-primary);
        font-weight: bold;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
    }

    .mp-browser-room-players {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-shrink: 0;
    }

    .mp-browser-placeholder {
        cursor: default;
    }

    .mp-placeholder-text {
        color: var(--color-text-muted);
        opacity: 0.4;
        font-style: italic;
    }

    @media (max-width: 600px) {
        .mp-feature-grid {
            grid-template-columns: 1fr;
        }
    }

    @media (max-width: 480px) {
        .mp-browser-room {
            padding: 10px 12px;
        }
    }
</style>
