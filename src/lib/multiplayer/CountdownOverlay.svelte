<script>
    import { onDestroy } from 'svelte';
    import { fade } from 'svelte/transition';
    import { AnimationTitles } from './animationCatalog.js';

    export let animations = [];

    // Find the animation the local player is counting down for
    $: countdownAnim = animations.find(a => a.sessionState === 2 && a.localInSession) || null;

    // Local countdown end-time, synced from server
    let endTime = 0;
    let displayNumber = 0;
    let animKey = 0; // toggles to retrigger CSS animation

    $: if (countdownAnim) {
        const serverEnd = Date.now() + countdownAnim.countdownMs;
        if (!endTime || Math.abs(endTime - serverEnd) > 500) {
            endTime = serverEnd;
        }
    } else {
        endTime = 0;
        displayNumber = 0;
    }

    let tickInterval;
    function tick() {
        if (!endTime) return;
        const remaining = Math.max(0, endTime - Date.now());
        const num = Math.ceil(remaining / 1000);
        if (num !== displayNumber) {
            displayNumber = num;
            animKey = 1 - animKey; // toggle to retrigger animation
        }
    }

    tickInterval = setInterval(tick, 100);
    onDestroy(() => clearInterval(tickInterval));

    $: animName = countdownAnim
        ? (AnimationTitles[countdownAnim.animIndex] || countdownAnim.name || '')
        : '';
</script>

{#if countdownAnim && displayNumber > 0}
    <div class="countdown-overlay" out:fade={{ duration: 200 }}>
        {#key animKey}
            <span class="countdown-number">{displayNumber}</span>
        {/key}
        {#if animName}
            <span class="countdown-label" in:fade={{ duration: 300 }}>{animName}</span>
        {/if}
    </div>
{/if}

<style>
    .countdown-overlay {
        position: fixed;
        top: 25%;
        left: 0;
        right: 0;
        z-index: 1001;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 0 16px;
        box-sizing: border-box;
        user-select: none;
    }

    .countdown-number {
        font-size: 72px;
        font-weight: 900;
        font-family: Arial, sans-serif;
        color: var(--color-primary);
        text-shadow:
            0 0 20px rgba(255, 215, 0, 0.5),
            0 0 40px rgba(255, 215, 0, 0.2),
            0 2px 8px rgba(0, 0, 0, 0.6);
        line-height: 1;
        animation: countdown-pulse 0.4s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .countdown-label {
        font-size: 14px;
        font-weight: 600;
        font-family: Arial, sans-serif;
        color: rgba(255, 255, 255, 0.7);
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
        text-align: center;
    }

    @keyframes countdown-pulse {
        0% {
            transform: scale(1.4);
            opacity: 0.6;
        }
        100% {
            transform: scale(1);
            opacity: 1;
        }
    }
</style>
