<script>
    import { onMount, onDestroy } from 'svelte';
    import { ActorRenderer } from '../core/rendering/ActorRenderer.js';
    import { buildGlobalPartsMap } from '../core/formats/WdbParser.js';
    import { getWdb } from '../core/wdbCache.js';
    import { ActorInfoInit, ActorDisplayNames } from '../core/savegame/actorConstants.js';
    import Carousel from './Carousel.svelte';

    export let selectedIndex = 0;
    export let onSelect = () => {};

    let canvas;
    let renderer = null;
    let loading = true;
    let error = null;
    let carousel;

    let globalPartsMap = null;
    let globalTextures = null;

    const nullCharacters = new Array(66).fill(null);

    function loadActor(index = selectedIndex) {
        if (!renderer || !globalPartsMap) return;
        renderer.loadActor(index, nullCharacters, globalPartsMap, globalTextures, null, null, null);
    }

    function handleChipClick(index) {
        if (index === selectedIndex) return;
        onSelect(index);
        loadActor(index);
        carousel?.scrollToIndex(index);
    }

    onMount(async () => {
        try {
            const { wdbData } = await getWdb();

            if (!wdbData.globalParts) throw new Error('No global parts found in WORLD.WDB');

            globalPartsMap = buildGlobalPartsMap(wdbData.globalParts);
            globalTextures = [
                ...(wdbData.globalTextures || []),
                ...(wdbData.globalParts.textures || [])
            ];

            renderer = new ActorRenderer(canvas);
            loadActor();
            renderer.start();
            loading = false;
            carousel?.scrollToIndex(selectedIndex);
        } catch (e) {
            console.error('ActorPicker initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
    });
</script>

<div class="actor-picker">
    <div class="actor-heading">
        <span class="actor-heading-label">Choose your character</span>
        <span class="tooltip-trigger">?
            <span class="tooltip-content">This is the visual model you'll use in multiplayer, regardless of which actor is selected in the Infocenter.</span>
        </span>
    </div>
    <div class="actor-preview">
        <div class="actor-preview-container">
            <canvas bind:this={canvas} class:hidden={loading || error} width="180" height="180"></canvas>
            {#if loading}
                <div class="actor-preview-overlay">
                    <div class="actor-spinner"></div>
                </div>
            {:else if error}
                <div class="actor-preview-overlay error">{error}</div>
            {/if}
        </div>
        <span class="actor-name">{ActorDisplayNames[selectedIndex] || ActorInfoInit[selectedIndex].name}</span>
    </div>

    <div class="actor-carousel-wrap">
        <Carousel bind:this={carousel} gap={4}>
            {#each ActorInfoInit as actor, i}
                <button
                    class="actor-chip"
                    class:selected={i === selectedIndex}
                    onclick={() => handleChipClick(i)}
                >
                    {ActorDisplayNames[i] || actor.name}
                </button>
            {/each}
        </Carousel>
    </div>
</div>

<style>
    .actor-picker {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .actor-heading {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .actor-heading-label {
        color: var(--color-text-light);
        font-size: 0.8em;
        font-weight: bold;
    }

    .actor-preview {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
    }

    .actor-name {
        color: var(--color-text-light);
        font-size: 0.8em;
        font-weight: bold;
    }

    .actor-carousel-wrap {
        width: 100%;
    }

    .actor-preview-container {
        position: relative;
        width: 180px;
        height: 180px;
    }

    .actor-preview-container canvas {
        display: block;
        border-radius: 8px;
        cursor: grab;
        width: 180px;
        height: 180px;
    }

    .actor-preview-container canvas:active {
        cursor: grabbing;
    }

    .actor-preview-container canvas:focus {
        outline: none;
    }

    .actor-preview-container canvas.hidden {
        visibility: hidden;
    }

    .actor-preview-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg-input);
        border-radius: 8px;
    }

    .actor-preview-overlay.error {
        color: var(--color-error, #e74c3c);
        font-size: 0.7em;
        padding: 8px;
        text-align: center;
    }

    .actor-spinner {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background:
            radial-gradient(transparent 55%, transparent 56%),
            conic-gradient(var(--color-primary, #FFD700) 0deg 90deg, var(--color-border-dark, #333) 90deg 360deg);
        animation: actor-spin 1s linear infinite;
    }

    @keyframes actor-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .actor-chip {
        flex-shrink: 0;
        padding: 3px 8px;
        font-size: 0.7em;
        font-family: inherit;
        border-radius: 10px;
        border: 1px solid var(--color-border-medium);
        background: var(--gradient-panel);
        color: var(--color-text-medium);
        cursor: pointer;
        white-space: nowrap;
        transition: border-color 0.2s ease, color 0.2s ease;
    }

    .actor-chip:hover {
        border-color: var(--color-text-light);
        color: var(--color-text-light);
    }

    .actor-chip.selected {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }
</style>
