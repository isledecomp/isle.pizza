<script>
    import { onMount, onDestroy } from 'svelte';
    import { PlantRenderer } from '../../core/rendering/PlantRenderer.js';
    import { WdbParser, buildGlobalPartsMap, buildPartsMap } from '../../core/formats/WdbParser.js';
    import {
        PlantInfoInit, PlantLodNames, PlantVariantNames, PlantColorNames,
        PLANT_COUNT, MAX_SOUND, MAX_MOVE, MAX_MOOD, MAX_COLOR, MAX_VARIANT,
        PLANT_SOUND_OFFSET
    } from '../../core/savegame/plantConstants.js';
    import { Actor } from '../../core/savegame/constants.js';
    import { fetchSoundAsWav } from '../../core/assetLoader.js';
    import NavButton from '../NavButton.svelte';
    import ResetButton from '../ResetButton.svelte';
    import EditorTooltip from '../EditorTooltip.svelte';

    export let slot;
    export let onUpdate = () => {};

    let canvas;
    let renderer = null;
    let loading = true;
    let error = null;

    // Cached WDB data
    let plantPartsMap = null;
    let plantTextures = null;

    let plantIndex = 0;
    let loadedPlantKey = null;

    let audioContext = null;
    let gainNode = null;
    const soundCache = new Map();

    async function playSound(name) {
        try {
            if (!audioContext) {
                audioContext = new AudioContext();
                gainNode = audioContext.createGain();
                gainNode.gain.value = 0.3;
                gainNode.connect(audioContext.destination);
            }
            if (audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            let audioBuffer = soundCache.get(name);
            if (!audioBuffer) {
                const wav = await fetchSoundAsWav(name);
                if (!wav) return;
                audioBuffer = await audioContext.decodeAudioData(wav);
                soundCache.set(name, audioBuffer);
            }

            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start();
        } catch (e) {
            console.error(`Failed to play sound ${name}:`, e);
        }
    }

    $: plantState = slot?.plants?.[plantIndex];
    $: variantName = plantState ? PlantVariantNames[plantState.variant] || 'Unknown' : '';
    $: colorName = plantState ? PlantColorNames[plantState.color] || 'Unknown' : '';

    $: isDefault = plantState && (() => {
        const def = PlantInfoInit[plantIndex];
        return def &&
            plantState.variant === def.variant &&
            plantState.sound === def.sound &&
            plantState.move === def.move &&
            plantState.mood === def.mood &&
            plantState.color === def.color &&
            plantState.counter === def.counter;
    })();

    function plantKey(slotNumber, idx, ps) {
        if (!ps) return '';
        return `${slotNumber}-${idx}-${ps.variant}-${ps.color}-${ps.mood}-${ps.counter}`;
    }

    onMount(async () => {
        try {
            const response = await fetch('/LEGO/data/WORLD.WDB');
            if (!response.ok) {
                throw new Error(`Failed to load WORLD.WDB: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const wdbParser = new WdbParser(buffer);
            const wdbData = wdbParser.parse();

            // Plant LODs are stored in ISLE world parts and/or global parts
            const partsMap = new Map();

            // Add global parts first
            if (wdbData.globalParts) {
                const globalMap = buildGlobalPartsMap(wdbData.globalParts);
                for (const [k, v] of globalMap) {
                    partsMap.set(k, v);
                }
            }

            // Scan ISLE world parts for plant LODs
            for (const world of wdbData.worlds) {
                if (world.name.toUpperCase() === 'ISLE') {
                    const worldMap = buildPartsMap(wdbParser, world.parts);
                    for (const [k, v] of worldMap) {
                        if (!partsMap.has(k)) {
                            partsMap.set(k, v);
                        }
                    }
                    break;
                }
            }

            plantPartsMap = partsMap;

            // Collect textures from global parts
            plantTextures = [
                ...(wdbData.globalTextures || []),
                ...(wdbData.globalParts?.textures || [])
            ];

            renderer = new PlantRenderer(canvas);
            loadCurrentPlant();
            renderer.start();
            loading = false;
        } catch (e) {
            console.error('PlantEditor initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
        audioContext?.close();
    });

    // Reload plant when index or state changes
    $: if (renderer && !loading && plantState) {
        if (plantKey(slot?.slotNumber, plantIndex, plantState) !== loadedPlantKey) {
            loadCurrentPlant();
        }
    }

    function loadCurrentPlant() {
        if (!renderer || !plantPartsMap || !plantState) return;

        renderer.loadPlant(plantState.variant, plantState.color, plantPartsMap, plantTextures);
        loadedPlantKey = plantKey(slot?.slotNumber, plantIndex, plantState);

        // Play queued click animation if any
        renderer.playQueuedAnimation();
    }

    function prevPlant() {
        plantIndex = plantIndex > 0 ? plantIndex - 1 : PLANT_COUNT - 1;
        loadedPlantKey = null;
    }

    function nextPlant() {
        plantIndex = plantIndex < PLANT_COUNT - 1 ? plantIndex + 1 : 0;
        loadedPlantKey = null;
    }

    function handleCanvasClick(event) {
        if (!renderer || !slot?.plants || !plantState) return;
        if (renderer.wasDragged()) return;

        const playerId = slot.header?.actorId;
        let acted = false;

        switch (playerId) {
            case Actor.PEPPER: switchVariant(); acted = true; break;
            case Actor.MAMA: switchSound(); acted = true; break;
            case Actor.PAPA: switchMove(); acted = true; break;
            case Actor.NICK: switchColor(); acted = true; break;
            case Actor.LAURA: switchMood(); acted = true; break;
        }

        if (!acted) return;

        // Play click sound: objectId = sound + 56
        const soundIdx = playerId === Actor.MAMA
            ? (plantState.sound + 1) % MAX_SOUND
            : plantState.sound;
        const soundObjectId = soundIdx + PLANT_SOUND_OFFSET;
        // ClickSound6/7/8 cover objectIds 56-58, PlantSound3-7 cover 59-63
        if (soundObjectId <= 58) {
            playSound(`ClickSound${soundObjectId - 50}`);
        } else {
            playSound(`PlantSound${soundIdx}`);
        }

        // Laura additionally plays a mood sound
        if (playerId === Actor.LAURA) {
            playSound(`MoodSound${((plantState.mood + 1) % MAX_MOOD) & 1}`);
        }

        // Queue click animation for visual changes
        const variant = playerId === Actor.PEPPER
            ? (plantState.variant + 1) % MAX_VARIANT
            : plantState.variant;
        const move = playerId === Actor.PAPA
            ? (plantState.move + 1) % MAX_MOVE[plantState.variant]
            : plantState.move;
        renderer.queueClickAnimation(variant, move);

        // For sound/move changes, play animation directly since model won't reload
        if (playerId === Actor.MAMA || playerId === Actor.PAPA) {
            renderer.playQueuedAnimation();
        }
    }

    function switchVariant() {
        const nextVariant = (plantState.variant + 1) % MAX_VARIANT;
        // Clamp move if it exceeds the new variant's max
        const clampedMove = plantState.move >= MAX_MOVE[nextVariant]
            ? MAX_MOVE[nextVariant] - 1
            : plantState.move;

        const updates = [
            { plantIndex, field: 'variant', value: nextVariant }
        ];
        if (clampedMove !== plantState.move) {
            updates.push({ plantIndex, field: 'move', value: clampedMove });
        }
        onUpdate({ plant: updates.length === 1 ? updates[0] : updates });
    }

    function switchSound() {
        const nextSound = (plantState.sound + 1) % MAX_SOUND;
        onUpdate({
            plant: { plantIndex, field: 'sound', value: nextSound }
        });
    }

    function switchMove() {
        const nextMove = (plantState.move + 1) % MAX_MOVE[plantState.variant];
        onUpdate({
            plant: { plantIndex, field: 'move', value: nextMove }
        });
    }

    function switchColor() {
        const nextColor = (plantState.color + 1) % MAX_COLOR;
        onUpdate({
            plant: { plantIndex, field: 'color', value: nextColor }
        });
    }

    function switchMood() {
        const nextMood = (plantState.mood + 1) % MAX_MOOD;
        onUpdate({
            plant: { plantIndex, field: 'mood', value: nextMood }
        });
    }

    function resetPlant() {
        const def = PlantInfoInit[plantIndex];
        if (!def) return;

        onUpdate({
            plant: [
                { plantIndex, field: 'variant', value: def.variant },
                { plantIndex, field: 'sound', value: def.sound },
                { plantIndex, field: 'move', value: def.move },
                { plantIndex, field: 'mood', value: def.mood },
                { plantIndex, field: 'color', value: def.color },
                { plantIndex, field: 'counter', value: def.counter }
            ]
        });
    }
</script>

<EditorTooltip text="Click to customize based on your current character. Navigate between all 81 plants using the arrows. Changes are automatically saved." onResetCamera={() => renderer?.resetView()}>
    <div class="preview-container">
        <canvas
            bind:this={canvas}
            width="190"
            height="190"
            class:hidden={loading || error}
            onclick={handleCanvasClick}
            role="button"
            tabindex="0"
            aria-label="Customize plant"
        ></canvas>

        {#if loading}
            <div class="preview-overlay">
                <div class="spinner"></div>
            </div>
        {:else if error}
            <div class="preview-overlay error">{error}</div>
        {/if}
    </div>

    <div class="part-nav-wrapper">
        <div class="part-nav">
            <NavButton direction="left" onclick={prevPlant} />
            <div class="part-info">
                <span class="plant-index">{plantIndex + 1} / {PLANT_COUNT}</span>
                <span class="plant-name">{colorName} {variantName}</span>
            </div>
            <NavButton direction="right" onclick={nextPlant} />
        </div>
    </div>

    <div class="reset-container">
        {#if !isDefault && !loading && !error}
            <ResetButton onclick={resetPlant} />
        {/if}
    </div>
</EditorTooltip>

<style>
    .preview-container {
        position: relative;
    }

    canvas {
        display: block;
        border-radius: 8px;
        cursor: grab;
        max-width: 100%;
    }

    canvas:active {
        cursor: grabbing;
    }

    canvas:focus {
        outline: none;
    }

    canvas.hidden {
        visibility: hidden;
    }

    .preview-overlay {
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

    .preview-overlay.error {
        color: var(--color-error, #e74c3c);
        font-size: 0.75em;
        padding: 12px;
        text-align: center;
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

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .part-nav-wrapper {
        margin-top: 10px;
    }

    .part-nav {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .part-info {
        text-align: center;
        min-width: 150px;
    }

    .plant-index {
        display: block;
        font-size: 0.7em;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .plant-name {
        display: block;
        font-size: 0.9em;
        color: var(--color-text-light);
    }

    .reset-container {
        height: 1.6em;
    }
</style>
