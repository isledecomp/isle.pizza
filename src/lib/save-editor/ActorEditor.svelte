<script>
    import { onMount, onDestroy } from 'svelte';
    import { ActorRenderer } from '../../core/rendering/ActorRenderer.js';
    import { WdbParser, buildGlobalPartsMap, buildPartsMap, resolveLods } from '../../core/formats/WdbParser.js';
    import { ActorInfoInit, ActorPart, ActorDisplayNames, ActorVehicles, VehicleDisplayNames } from '../../core/savegame/actorConstants.js';
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
    let globalPartsMap = null;
    let globalTextures = null;
    let vehiclePartsMap = null;
    let vehicleTextures = null;

    let actorIndex = 0;
    let loadedActorKey = null;
    let showVehicle = false;

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

    $: actorInfo = ActorInfoInit[actorIndex];
    $: actorName = ActorDisplayNames[actorIndex] || actorInfo?.name || 'Unknown';
    $: charState = slot?.characters?.[actorIndex];
    $: vehicleInfo = ActorVehicles[actorIndex] || null;
    $: vehicleName = vehicleInfo ? VehicleDisplayNames[vehicleInfo.vehicleModel] : null;

    $: isDefault = actorInfo && charState &&
        charState.sound === actorInfo.sound &&
        charState.move === actorInfo.move &&
        charState.mood === actorInfo.mood &&
        charState.hatPartNameIndex === actorInfo.parts[1].partNameIndex &&
        charState.hatNameIndex === actorInfo.parts[1].nameIndex &&
        charState.infogronNameIndex === actorInfo.parts[2].nameIndex &&
        charState.armlftNameIndex === actorInfo.parts[4].nameIndex &&
        charState.armrtNameIndex === actorInfo.parts[5].nameIndex &&
        charState.leglftNameIndex === actorInfo.parts[8].nameIndex &&
        charState.legrtNameIndex === actorInfo.parts[9].nameIndex;

    function actorKey(slotNumber, idx, cs, vehicle) {
        return `${slotNumber}-${idx}-${cs.hatPartNameIndex}-${cs.hatNameIndex}-${cs.infogronNameIndex}-${cs.armlftNameIndex}-${cs.armrtNameIndex}-${cs.leglftNameIndex}-${cs.legrtNameIndex}-${cs.mood}-${vehicle}`;
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

            if (wdbData.globalParts) {
                globalPartsMap = buildGlobalPartsMap(wdbData.globalParts);
                // Merge global textures (chest/face textures) with global parts textures (hat textures etc.)
                globalTextures = [
                    ...(wdbData.globalTextures || []),
                    ...(wdbData.globalParts.textures || [])
                ];
            } else {
                throw new Error('No global parts found in WORLD.WDB');
            }

            // Collect vehicle model names needed
            const neededVehicles = new Set();
            for (const v of Object.values(ActorVehicles)) {
                neededVehicles.add(v.vehicleModel.toLowerCase());
            }

            // Vehicle geometries are stored as models (not parts) in WDB worlds.
            // Scan worlds for matching model entries, parse model data, and
            // collect all ROIs (root + children) with resolved LODs.
            const vModelsMap = new Map();
            const vTextures = [];
            for (const world of wdbData.worlds) {
                let worldPartsMap = null;
                for (const model of world.models) {
                    const modelKey = model.name.toLowerCase();
                    if (!neededVehicles.has(modelKey) || vModelsMap.has(modelKey)) continue;
                    const modelData = wdbParser.parseModelData(model.dataOffset);
                    const roi = modelData.roi;
                    if (!roi) continue;

                    // Build world parts map lazily (needed for shared LOD resolution)
                    if (!worldPartsMap) {
                        worldPartsMap = buildPartsMap(wdbParser, world.parts);
                    }

                    // Collect all renderable ROIs (root + children recursively)
                    const rois = [];
                    const collectRois = (node) => {
                        const lods = resolveLods(node, worldPartsMap);
                        if (lods.length > 0) {
                            rois.push({ name: node.name, lods });
                        }
                        for (const child of node.children || []) {
                            collectRois(child);
                        }
                    };
                    collectRois(roi);

                    if (rois.length > 0) {
                        vModelsMap.set(modelKey, rois);
                    }
                    if (modelData.textures) {
                        vTextures.push(...modelData.textures);
                    }
                }
            }
            vehiclePartsMap = vModelsMap;
            vehicleTextures = vTextures;

            renderer = new ActorRenderer(canvas);
            loadCurrentActor();
            renderer.start();
            loading = false;
        } catch (e) {
            console.error('ActorEditor initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
        audioContext?.close();
    });

    // Reload actor when index, character state, or vehicle toggle changes
    $: if (renderer && !loading && actorInfo && charState) {
        if (actorKey(slot?.slotNumber, actorIndex, charState, showVehicle) !== loadedActorKey) {
            loadCurrentActor();
        }
    }

    function loadCurrentActor() {
        if (!renderer || !globalPartsMap || !slot?.characters) return;

        const activeVehicle = showVehicle ? vehicleInfo : null;
        renderer.loadActor(
            actorIndex, slot.characters, globalPartsMap, globalTextures,
            activeVehicle ? vehiclePartsMap : null,
            activeVehicle ? vehicleTextures : null,
            activeVehicle
        );
        loadedActorKey = actorKey(slot?.slotNumber, actorIndex, slot.characters[actorIndex], showVehicle);
    }

    function prevActor() {
        actorIndex = actorIndex > 0 ? actorIndex - 1 : ActorInfoInit.length - 1;
        showVehicle = false;
        loadedActorKey = null;
    }

    function nextActor() {
        actorIndex = actorIndex < ActorInfoInit.length - 1 ? actorIndex + 1 : 0;
        showVehicle = false;
        loadedActorKey = null;
    }

    function handleCanvasClick(event) {
        if (!renderer || !slot?.characters || !charState) return;
        if (renderer.wasDragged()) return;

        const playerId = slot.header?.actorId;
        let acted = false;
        let clickMove = charState.move;

        switch (playerId) {
            case Actor.PEPPER: switchVariant(); acted = true; break;
            case Actor.MAMA: switchSound(); acted = true; break;
            case Actor.PAPA: clickMove = switchMove(); acted = true; break;
            case Actor.NICK: acted = switchColor(event); break;
            case Actor.LAURA: switchMood(); acted = true; break;
        }

        if (!acted) return;

        // Play click sound (Mama plays the *new* sound after cycling)
        const soundIdx = playerId === Actor.MAMA
            ? (charState.sound + 1) % 9
            : charState.sound;
        playSound(`ClickSound${soundIdx}`);

        // Laura additionally plays a mood sound
        if (playerId === Actor.LAURA) {
            playSound(`MoodSound${(charState.mood + 1) % 4}`);
        }

        // Queue click animation — consumed by loadAnimationForActor
        renderer.queueClickAnimation(clickMove);

        // Sound/move changes don't affect the actorKey, so the reactive block
        // won't trigger a model reload. Play the click animation directly.
        // For visual changes (hat/color/mood), the reactive block will call
        // loadCurrentActor → loadAnimationForActor, which consumes the queue.
        if (playerId === Actor.MAMA || playerId === Actor.PAPA) {
            renderer.loadAnimationForActor(actorIndex, charState.mood);
        }
    }

    function switchVariant() {
        const part = actorInfo.parts[ActorPart.INFOHAT];
        if (!part.partNameIndices) return;

        const maxIdx = part.partNameIndices.length;
        const nextIdx = (charState.hatPartNameIndex + 1) % maxIdx;

        onUpdate({
            character: { characterIndex: actorIndex, field: 'hatPartNameIndex', value: nextIdx }
        });
    }

    function switchSound() {
        const nextSound = (charState.sound + 1) % 9;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'sound', value: nextSound }
        });
    }

    function switchMove() {
        const nextMove = (charState.move + 1) % 4;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'move', value: nextMove }
        });
        return nextMove;
    }

    function switchColor(event) {
        let partIdx = renderer.getClickedPart(event);
        if (partIdx < 0) return false;

        // Remap clicked part to the part that owns its color
        // (matches SwitchColor in legocharactermanager.cpp)
        if (partIdx === ActorPart.CLAWLFT) partIdx = ActorPart.ARMLFT;
        else if (partIdx === ActorPart.CLAWRT) partIdx = ActorPart.ARMRT;
        else if (partIdx === ActorPart.HEAD) partIdx = ActorPart.INFOHAT;
        else if (partIdx === ActorPart.BODY) partIdx = ActorPart.INFOGRON;

        // Map part index to the save field
        const fieldMap = {
            [ActorPart.INFOHAT]: 'hatNameIndex',
            [ActorPart.INFOGRON]: 'infogronNameIndex',
            [ActorPart.ARMLFT]: 'armlftNameIndex',
            [ActorPart.ARMRT]: 'armrtNameIndex',
            [ActorPart.LEGLFT]: 'leglftNameIndex',
            [ActorPart.LEGRT]: 'legrtNameIndex'
        };

        const field = fieldMap[partIdx];
        if (!field) return false;

        const part = actorInfo.parts[partIdx];
        if (!part.nameIndices) return false;

        const currentIdx = charState[field] ?? part.nameIndex;
        const maxIdx = part.nameIndices.length;
        const nextIdx = (currentIdx + 1) % maxIdx;

        onUpdate({
            character: { characterIndex: actorIndex, field, value: nextIdx }
        });
        return true;
    }

    function switchMood() {
        const nextMood = (charState.mood + 1) % 4;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'mood', value: nextMood }
        });
    }

    function resetActor() {
        const i = actorIndex;
        const p = actorInfo.parts;
        onUpdate({
            character: [
                { characterIndex: i, field: 'sound', value: actorInfo.sound },
                { characterIndex: i, field: 'move', value: actorInfo.move },
                { characterIndex: i, field: 'mood', value: actorInfo.mood },
                { characterIndex: i, field: 'hatPartNameIndex', value: p[1].partNameIndex },
                { characterIndex: i, field: 'hatNameIndex', value: p[1].nameIndex },
                { characterIndex: i, field: 'infogronNameIndex', value: p[2].nameIndex },
                { characterIndex: i, field: 'armlftNameIndex', value: p[4].nameIndex },
                { characterIndex: i, field: 'armrtNameIndex', value: p[5].nameIndex },
                { characterIndex: i, field: 'leglftNameIndex', value: p[8].nameIndex },
                { characterIndex: i, field: 'legrtNameIndex', value: p[9].nameIndex }
            ]
        });
    }
</script>

<EditorTooltip text="Click to customize based on your current character. Navigate between all 66 game actors using the arrows. Changes are automatically saved.">
    <div class="preview-container">
        <canvas
            bind:this={canvas}
            width="190"
            height="190"
            class:hidden={loading || error}
            onclick={handleCanvasClick}
            role="button"
            tabindex="0"
            aria-label="Customize actor"
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
            <NavButton direction="left" onclick={prevActor} />
            <div class="part-info">
                <span class="actor-index">{actorIndex + 1} / {ActorInfoInit.length}</span>
                <span class="actor-name">{actorName}</span>
            </div>
            <NavButton direction="right" onclick={nextActor} />
        </div>
        {#if vehicleInfo}
            <button
                type="button"
                class="vehicle-toggle-btn"
                class:active={showVehicle}
                onclick={() => { showVehicle = !showVehicle; }}
                title={showVehicle ? 'Show without vehicle' : `Show with ${vehicleName}`}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 12.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm8 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM5.5 11h5V9.5L13 8l-1-3H4L2.5 8l2.5 1.5V11h.5z"/>
                </svg>
            </button>
        {/if}
    </div>

    <div class="reset-container">
        {#if !isDefault && !loading && !error}
            <ResetButton onclick={resetActor} />
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
        position: relative;
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

    .actor-index {
        display: block;
        font-size: 0.7em;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .actor-name {
        display: block;
        font-size: 0.9em;
        color: var(--color-text-light);
    }

    .vehicle-toggle-btn {
        position: absolute;
        right: -36px;
        top: 50%;
        transform: translateY(-50%);
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        padding: 0;
        background: var(--color-bg-input);
        border: 1px solid var(--color-border-medium);
        border-radius: 6px;
        color: var(--color-text-light);
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .vehicle-toggle-btn:hover,
    .vehicle-toggle-btn.active {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }

    .reset-container {
        height: 1.6em;
    }
</style>
