<script>
    import PeopleIcon from './PeopleIcon.svelte';

    export let playerCount;
    export let badgeBump;
    export let disabled;
    export let reconnecting = false;
    export let connectionFailed = false;
    export let active;
    export let onclick;
    export let canFastJoin = false;
    export let onFastJoin = () => {};

    $: title = reconnecting ? 'Reconnecting...'
             : connectionFailed ? 'Disconnected'
             : disabled ? 'Multiplayer (enter Isle world to use)'
             : 'Multiplayer';

    function handleJoinClick(e) {
        e.stopPropagation();
        onFastJoin();
    }
</script>

<button class="fab" class:active class:disabled class:reconnecting class:failed={connectionFailed}
    onclick={onclick}
    {title}>
    {#if reconnecting}
        <span class="fab-status-dot pulse"></span>
    {:else if connectionFailed}
        <span class="fab-status-dot failed"></span>
    {:else}
        <PeopleIcon size={20} />
    {/if}
    {#if playerCount != null && !reconnecting && !connectionFailed}
        <span class="badge" class:bump={badgeBump}>{playerCount}</span>
    {/if}
    {#if canFastJoin}
        <span class="join-badge" role="button" tabindex="-1" onclick={handleJoinClick} onkeydown={(e) => e.key === 'Enter' && handleJoinClick(e)}>Join</span>
    {/if}
</button>

<style>
    .fab {
        position: fixed;
        bottom: 16px;
        right: 16px;
        z-index: 1000;
        width: 52px;
        height: 52px;
        box-sizing: border-box;
        border-radius: 50%;
        background: rgba(24, 24, 24, 0.85);
        border: 2px solid rgba(255, 215, 0, 0.5);
        color: var(--color-primary);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        font-family: Arial, sans-serif;
        outline: none;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
        transition: transform 0.2s cubic-bezier(0.34, 1.2, 0.64, 1),
                    opacity 0.15s ease,
                    background 0.2s ease,
                    border-color 0.2s ease;
        transform-origin: center center;
    }

    .fab.active {
        background: rgba(255, 215, 0, 0.12);
        border-color: var(--color-primary);
    }

    @media (hover: hover) {
        .fab:hover {
            background: rgba(255, 215, 0, 0.12);
            border-color: var(--color-primary);
        }

        .fab.disabled:hover,
        .fab.reconnecting:hover,
        .fab.failed:hover {
            background: rgba(24, 24, 24, 0.85);
        }

        .fab.disabled:hover { border-color: rgba(255, 255, 255, 0.15); }
        .fab.reconnecting:hover { border-color: rgba(255, 165, 0, 0.6); }
        .fab.failed:hover { border-color: rgba(255, 107, 107, 0.6); }
    }

    .fab.disabled {
        border-color: rgba(255, 255, 255, 0.15);
        color: var(--color-text-muted);
        opacity: 0.5;
        cursor: default;
    }

    .fab.reconnecting {
        border-color: rgba(255, 165, 0, 0.6);
        opacity: 1;
    }

    .fab.failed {
        border-color: rgba(255, 107, 107, 0.6);
        opacity: 1;
    }

    .fab-status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }

    .fab-status-dot.pulse {
        background: #ffa500;
        animation: status-pulse 1.5s ease-in-out infinite;
    }

    .fab-status-dot.failed {
        background: #ff6b6b;
    }

    @keyframes status-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
    }

    .badge {
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        background: var(--color-primary);
        color: #000;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        line-height: 1;
        pointer-events: none;
    }

    .badge.bump {
        animation: badge-bump 0.4s ease;
    }

    @keyframes badge-bump {
        0% { transform: scale(1); }
        40% { transform: scale(1.2); }
        100% { transform: scale(1); }
    }

    .join-badge {
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        padding: 2px 8px;
        border-radius: 8px;
        background: rgba(100, 181, 246, 0.9);
        color: #000;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        pointer-events: auto;
        animation: join-badge-pulse 2s ease-in-out infinite;
    }

    @keyframes join-badge-pulse {
        0%, 100% { background: rgba(100, 181, 246, 0.85); }
        50% { background: rgba(100, 181, 246, 1); }
    }
</style>
