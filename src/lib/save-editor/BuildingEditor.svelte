<script>
    import { onMount, onDestroy } from 'svelte';
    import { BuildingRenderer } from '../../core/rendering/BuildingRenderer.js';
    import { WdbParser, buildPartsMap, buildGlobalPartsMap, resolveLods } from '../../core/formats/WdbParser.js';
    import {
        BuildingInfoInit, BuildingDisplayNames, BuildingVariants,
        BUILDING_COUNT, MAX_SOUND, MAX_MOVE, MAX_MOOD, MAX_VARIANT,
        BUILDING_SOUND_OFFSET, BUILDING_MOOD_SOUND_OFFSET,
        BuildingFlags, BuildingAnimationId, HAUS1_INDEX
    } from '../../core/savegame/buildingConstants.js';
    import { Actor } from '../../core/savegame/constants.js';
    import { createSoundPlayer } from '../../core/audio.js';
    import NavButton from '../NavButton.svelte';
    import ResetButton from '../ResetButton.svelte';
    import EditorTooltip from '../EditorTooltip.svelte';
    import './editor-common.css';

    export let slot;
    export let onUpdate = () => {};

    let canvas;
    let renderer = null;
    let loading = true;
    let error = null;

    // Cached WDB data: modelName -> { rois, textures }
    let buildingModelsMap = null;

    let buildingIndex = 0;
    let loadedBuildingKey = null;

    const soundPlayer = createSoundPlayer();

    $: buildingState = slot?.buildings?.[buildingIndex];
    $: displayName = BuildingDisplayNames[buildingIndex] || 'Unknown';
    $: buildingInfo = BuildingInfoInit[buildingIndex];
    $: hasCustomization = buildingInfo && (buildingInfo.flags & (BuildingFlags.c_hasSounds | BuildingFlags.c_hasMoves | BuildingFlags.c_hasMoods | BuildingFlags.c_hasVariants)) !== 0;

    // For haus1, show the current variant name
    $: variantLabel = buildingIndex === HAUS1_INDEX && slot?.nextVariant !== null && slot?.nextVariant !== undefined
        ? BuildingVariants[slot.nextVariant] || ''
        : '';

    $: isDefault = buildingState && (() => {
        const def = BuildingInfoInit[buildingIndex];
        if (!def) return true;
        const fieldsMatch = buildingState.sound === def.sound &&
            buildingState.move === def.move &&
            buildingState.mood === def.mood &&
            buildingState.counter === def.counter;
        if (buildingIndex === HAUS1_INDEX) {
            return fieldsMatch && (slot?.nextVariant === 0);
        }
        return fieldsMatch;
    })();

    function buildingKey(slotNumber, idx, nextVariant) {
        const nv = idx === HAUS1_INDEX ? nextVariant : 0;
        return `${slotNumber}-${idx}-${nv}`;
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

            // Collect all building model names we need
            const neededModels = new Set();
            for (const info of BuildingInfoInit) {
                neededModels.add(info.name.toLowerCase());
            }
            // Also need haus variant models
            for (const v of BuildingVariants) {
                neededModels.add(v.toLowerCase());
            }

            // Global textures (needed for some building meshes)
            const globalTextures = [
                ...(wdbData.globalTextures || []),
                ...(wdbData.globalParts?.textures || [])
            ];

            // Scan worlds for building models, like ActorEditor does for vehicles.
            // Buildings live in multiple worlds: Isle, ACT1, ACT2, ACT3, etc.
            // Prefer Isle world, fall back to ACT1 for buildings not in Isle.
            const modelsMap = new Map();
            for (const world of wdbData.worlds) {
                let worldPartsMap = null;
                for (const model of world.models) {
                    const modelKey = model.name.toLowerCase();
                    if (!neededModels.has(modelKey) || modelsMap.has(modelKey)) continue;

                    const modelData = wdbParser.parseModelData(model.dataOffset);
                    const roi = modelData.roi;
                    if (!roi) continue;

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
                        // Merge model-specific textures with globals
                        const textures = [
                            ...globalTextures,
                            ...(modelData.textures || [])
                        ];
                        modelsMap.set(modelKey, { rois, textures });
                    }
                }
            }

            buildingModelsMap = modelsMap;

            renderer = new BuildingRenderer(canvas);
            loadCurrentBuilding();
            renderer.start();
            loading = false;
        } catch (e) {
            console.error('BuildingEditor initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
        soundPlayer.dispose();
    });

    // Reload building when index or variant changes (not sound/move/mood)
    $: if (renderer && !loading && buildingState) {
        if (buildingKey(slot?.slotNumber, buildingIndex, slot?.nextVariant) !== loadedBuildingKey) {
            loadCurrentBuilding();
        }
    }

    function loadCurrentBuilding() {
        if (!renderer || !buildingModelsMap || !buildingState) return;

        // For haus1, use the variant name from BuildingVariants
        let modelName = buildingInfo.name.toLowerCase();
        if (buildingIndex === HAUS1_INDEX && slot?.nextVariant !== null && slot?.nextVariant !== undefined) {
            modelName = (BuildingVariants[slot.nextVariant] || buildingInfo.name).toLowerCase();
        }

        const modelData = buildingModelsMap.get(modelName);
        if (modelData) {
            renderer.loadBuilding(modelData.rois, modelData.textures);
        } else {
            renderer.clearModel();
        }

        loadedBuildingKey = buildingKey(slot?.slotNumber, buildingIndex, slot?.nextVariant);

        // Play queued click animation if any
        renderer.playQueuedAnimation();
    }

    function prevBuilding() {
        buildingIndex = buildingIndex > 0 ? buildingIndex - 1 : BUILDING_COUNT - 1;
        loadedBuildingKey = null;
    }

    function nextBuilding() {
        buildingIndex = buildingIndex < BUILDING_COUNT - 1 ? buildingIndex + 1 : 0;
        loadedBuildingKey = null;
    }

    function handleCanvasClick(event) {
        if (!renderer || !slot?.buildings || !buildingState) return;
        if (renderer.wasDragged()) return;

        const playerId = slot.header?.actorId;
        if (!hasCustomization) return;

        const flags = buildingInfo.flags;
        const canSound = (flags & BuildingFlags.c_hasSounds) !== 0;
        const canMove = (flags & BuildingFlags.c_hasMoves) !== 0;

        // Perform the character-specific switch operation.
        // In the game, ClickSound + ClickAnimation always run after
        // Switch* regardless of whether the switch changed anything.
        switch (playerId) {
            case Actor.PEPPER: switchVariant(); break;
            case Actor.MAMA: switchSound(); break;
            case Actor.PAPA: switchMove(); break;
            case Actor.NICK: break; // Buildings don't support color
            case Actor.LAURA: switchMood(); break;
        }

        // ClickSound — plays if building has c_hasSounds.
        // SwitchMood calls ClickSound(TRUE) then ClickSound(FALSE) — both.
        if (canSound) {
            if (playerId === Actor.LAURA) {
                // ClickSound(TRUE): mood-based sound (objectId = newMood + 66)
                const newMood = (buildingState.mood + 1) % MAX_MOOD;
                soundPlayer.play(`MoodSound${newMood}`);
            }

            // ClickSound(FALSE): regular click sound (objectId = sound + 60)
            const soundIdx = playerId === Actor.MAMA
                ? (buildingState.sound + 1) % MAX_SOUND
                : buildingState.sound;
            const soundObjectId = soundIdx + BUILDING_SOUND_OFFSET;
            // objectIds 60-63 = PlantSound4-7, 64-65 = BuildingSound4-5
            if (soundObjectId <= 63) {
                soundPlayer.play(`PlantSound${soundIdx + 4}`);
            } else {
                soundPlayer.play(`BuildingSound${soundIdx}`);
            }
        }

        // ClickAnimation — plays if building has c_hasMoves
        if (canMove && BuildingAnimationId[buildingIndex] > 0) {
            const move = playerId === Actor.PAPA
                ? (buildingState.move + 1) % MAX_MOVE[buildingIndex]
                : buildingState.move;
            renderer.queueClickAnimation(buildingIndex, move);

            // Model only reloads for Pepper variant switch on haus1;
            // in all other cases play animation directly
            if (playerId !== Actor.PEPPER || buildingIndex !== HAUS1_INDEX) {
                renderer.playQueuedAnimation();
            }
        }
    }

    function switchVariant() {
        // Only haus1 (index 12) supports variants
        if (buildingIndex !== HAUS1_INDEX) return false;
        if (!(buildingInfo.flags & BuildingFlags.c_hasVariants)) return false;

        const nextVar = ((slot?.nextVariant ?? 0) + 1) % MAX_VARIANT;
        onUpdate({ nextVariant: nextVar });
        return true;
    }

    function switchSound() {
        if (!(buildingInfo.flags & BuildingFlags.c_hasSounds)) return false;

        const nextSound = (buildingState.sound + 1) % MAX_SOUND;
        onUpdate({
            building: { buildingIndex, field: 'sound', value: nextSound }
        });
        return true;
    }

    function switchMove() {
        if (!(buildingInfo.flags & BuildingFlags.c_hasMoves)) return false;
        if (MAX_MOVE[buildingIndex] === 0) return false;

        const nextMove = (buildingState.move + 1) % MAX_MOVE[buildingIndex];
        onUpdate({
            building: { buildingIndex, field: 'move', value: nextMove }
        });
        return true;
    }

    function switchMood() {
        if (!(buildingInfo.flags & BuildingFlags.c_hasMoods)) return false;

        const nextMood = (buildingState.mood + 1) % MAX_MOOD;
        onUpdate({
            building: { buildingIndex, field: 'mood', value: nextMood }
        });
        return true;
    }

    function resetBuilding() {
        const def = BuildingInfoInit[buildingIndex];
        if (!def) return;

        const updates = {
            building: [
                { buildingIndex, field: 'sound', value: def.sound },
                { buildingIndex, field: 'move', value: def.move },
                { buildingIndex, field: 'mood', value: def.mood },
                { buildingIndex, field: 'counter', value: def.counter }
            ]
        };

        if (buildingIndex === HAUS1_INDEX) {
            updates.nextVariant = 0;
        }

        onUpdate(updates);
    }
</script>

<EditorTooltip text="Click to customize based on your current character. Navigate between all 16 buildings using the arrows. Changes are automatically saved." onResetCamera={() => renderer?.resetView()}>
    <div class="preview-container">
        <canvas
            bind:this={canvas}
            width="190"
            height="190"
            class:hidden={loading || error}
            onclick={handleCanvasClick}
            role="button"
            tabindex="0"
            aria-label="Customize building"
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
            <NavButton direction="left" onclick={prevBuilding} />
            <div class="part-info">
                <span class="nav-index">{buildingIndex + 1} / {BUILDING_COUNT}</span>
                <span class="nav-name">{displayName}{variantLabel ? ` (${variantLabel})` : ''}</span>
            </div>
            <NavButton direction="right" onclick={nextBuilding} />
        </div>
    </div>

    <div class="reset-container">
        {#if !isDefault && !loading && !error}
            <ResetButton onclick={resetBuilding} />
        {/if}
    </div>
</EditorTooltip>
