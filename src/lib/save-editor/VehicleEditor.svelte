<script>
    import { onMount, onDestroy } from 'svelte';
    import { VehiclePartRenderer } from '../../core/rendering/VehiclePartRenderer.js';
    import { WdbParser, findRoi, buildPartsMap } from '../../core/formats/WdbParser.js';
    import {
        LegoColorNames,
        VehicleWorlds,
        VehicleModels,
        VehicleNames,
        VehiclePartColors,
        TexturedParts,
        Act1PlaneIndices
    } from '../../core/savegame/constants.js';
    import { squareTexture } from '../../core/savegame/imageQuantizer.js';
    import { parseTex } from '../../core/formats/TexParser.js';
    import NavButton from '../NavButton.svelte';
    import ResetButton from '../ResetButton.svelte';
    import EditorTooltip from '../EditorTooltip.svelte';
    import TexturePickerModal from './TexturePickerModal.svelte';

    export let slot;
    export let onUpdate = () => {};

    // Build flat list of all parts across all vehicles
    const vehicleList = ['dunebuggy', 'helicopter', 'jetski', 'racecar'];
    const allParts = vehicleList.flatMap(v =>
        (VehiclePartColors[v] || []).map(p => ({ ...p, vehicle: v }))
    );

    let canvas;
    let renderer = null;
    let loading = true;
    let error = null;
    let partError = null;

    // Cached WDB data
    let wdbParser = null;
    let wdbData = null;

    let globalIndex = 0;

    // Track current loaded part to avoid redundant reloads
    let loadedPartKey = null;

    // Texture modal state
    let showTextureModal = false;
    let texturePalette = null;
    let wdbTexture = null;
    let preloadedDefaults = null;

    // Current part info from flat list
    $: currentEntry = allParts[globalIndex];
    $: vehicle = currentEntry?.vehicle || 'dunebuggy';
    $: currentPart = currentEntry;

    // Get current color from slot variables
    $: currentColorValue = currentPart
        ? slot?.variables?.get(currentPart.variable)?.value || currentPart.defaultColor
        : 'lego red';

    // Check if current color differs from default
    $: isDefaultColor = currentPart && currentColorValue === currentPart.defaultColor;

    // Texture info for current part (if it's a textured part)
    $: textureInfo = currentPart ? TexturedParts[currentPart.part] || null : null;

    // Check if vehicle has a plane in Act1State (vehicle is placed in world)
    $: vehicleHasPlane = (() => {
        if (!textureInfo || !slot?.act1State) return false;
        const planeIdx = Act1PlaneIndices[textureInfo.vehicle];
        return planeIdx !== undefined && slot.act1State.planes[planeIdx]?.nameLength > 0;
    })();

    // Can edit texture: part has texture info AND vehicle plane exists in Act1State
    $: canEditTexture = textureInfo && vehicleHasPlane;

    onMount(async () => {
        try {
            // Load and parse WDB once
            const response = await fetch('/LEGO/data/WORLD.WDB');
            if (!response.ok) {
                throw new Error(`Failed to load WORLD.WDB: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            wdbParser = new WdbParser(buffer);
            wdbData = wdbParser.parse();

            // Initialize renderer
            renderer = new VehiclePartRenderer(canvas);

            // Load initial part
            await loadCurrentPart();

            renderer.start();
            loading = false;
        } catch (e) {
            console.error('VehiclePartColorEditor initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
    });

    // Reload part when index or slot changes
    $: if (renderer && !loading && currentPart) {
        const partKey = `${slot?.slotNumber}-${vehicle}-${globalIndex}`;
        if (partKey !== loadedPartKey) {
            loadCurrentPart();
        }
    }

    // Check if current texture matches the WDB default.
    // Declared after the loadCurrentPart block: Svelte 5 runs legacy $: effects
    // in source order, and wdbTexture must be set before this evaluates.
    function isTextureDefault(info, wdbTex, act1Textures) {
        if (!info || !wdbTex || !act1Textures) return true;
        const act1Tex = act1Textures.get(info.textureName.toLowerCase());
        if (!act1Tex) return true;
        if (act1Tex.pixels.length !== wdbTex.pixels.length) return false;
        for (let i = 0; i < act1Tex.pixels.length; i++) {
            if (act1Tex.pixels[i] !== wdbTex.pixels[i]) return false;
        }
        return true;
    }

    $: isDefaultTexture = isTextureDefault(textureInfo, wdbTexture, slot?.act1State?.textures);

    // Update color when variable changes (without reloading geometry)
    $: if (renderer && !loading && currentColorValue && loadedPartKey) {
        renderer.updateColor(currentColorValue);
    }

    async function loadCurrentPart() {
        if (!wdbData || !wdbParser || !currentPart || !renderer) return;

        partError = null;
        const partKey = `${slot?.slotNumber}-${vehicle}-${globalIndex}`;

        try {
            const worldName = VehicleWorlds[vehicle];
            const modelName = VehicleModels[vehicle];

            // Find the vehicle world
            const world = wdbData.worlds.find(w => w.name === worldName);
            if (!world) {
                partError = `World ${worldName} not found`;
                return;
            }

            // Find the vehicle model
            const model = world.models.find(m =>
                m.name.toLowerCase() === modelName.toLowerCase()
            );
            if (!model) {
                partError = `Model ${modelName} not found`;
                return;
            }

            // Parse model data
            const modelData = wdbParser.parseModelData(model.dataOffset);

            // Find the part ROI
            const partRoi = findRoi(modelData.roi, currentPart.part);
            if (!partRoi) {
                partError = `Part not found`;
                return;
            }

            // Build parts map for shared LOD resolution
            const partsMap = buildPartsMap(wdbParser, world.parts);

            // Build texture list, merging Act1State texture if available
            let textures = modelData.textures || [];
            if (textureInfo && slot?.act1State?.textures) {
                const texKey = textureInfo.textureName.toLowerCase();
                const act1Tex = slot.act1State.textures.get(texKey);
                if (act1Tex) {
                    const existingIdx = textures.findIndex(t => t.name?.toLowerCase() === texKey);
                    if (existingIdx >= 0) {
                        textures = [...textures];
                        textures[existingIdx] = { ...act1Tex, name: texKey };
                    } else {
                        textures = [...textures, { ...act1Tex, name: texKey }];
                    }
                }
            }

            // Extract palette from the WDB texture (the ground truth) for the
            // texture picker modal. The game's LoadBits() only overwrites pixel
            // data on the DirectDraw surface — the palette always stays from the
            // original WDB load. So custom pixel indices must reference THIS palette.
            if (textureInfo) {
                const texKey = textureInfo.textureName.toLowerCase();
                const wdbTex = (modelData.textures || []).find(t => t.name === texKey);
                if (wdbTex) {
                    texturePalette = wdbTex.palette;
                    wdbTexture = squareTexture(wdbTex);
                } else {
                    wdbTexture = null;
                }
            } else {
                wdbTexture = null;
            }

            // Load part with current color, textures, and parts map for shared LOD lookup
            renderer.loadPartWithColor(partRoi, currentColorValue, textures, partsMap)
            loadedPartKey = partKey;

            // Preload default .tex files in background for the texture picker
            if (textureInfo) {
                preloadDefaultTextures(textureInfo);
            } else {
                preloadedDefaults = null;
            }
        } catch (e) {
            console.error('Failed to load part:', e);
            partError = e.message;
        }
    }

    async function preloadDefaultTextures(info) {
        const loaded = [];
        for (const texFile of info.texFiles) {
            const response = await fetch(`/${texFile}.tex`);
            if (!response.ok) continue;
            const buffer = await response.arrayBuffer();
            const parsed = parseTex(buffer);
            if (parsed.textures.length > 0) {
                loaded.push({ name: texFile, ...parsed.textures[0] });
            }
        }
        // Only apply if textureInfo hasn't changed since we started
        if (textureInfo === info) {
            preloadedDefaults = loaded;
        }
    }

    function prevPart() {
        globalIndex = globalIndex > 0 ? globalIndex - 1 : allParts.length - 1;
        loadedPartKey = null;
    }

    function nextPart() {
        globalIndex = globalIndex < allParts.length - 1 ? globalIndex + 1 : 0;
        loadedPartKey = null;
    }

    function cycleColor() {
        if (!currentPart || partError) return;

        // Find current color index and cycle to next
        const currentIdx = LegoColorNames.indexOf(currentColorValue);
        const nextIdx = (currentIdx + 1) % LegoColorNames.length;
        const nextColor = LegoColorNames[nextIdx];

        onUpdate({
            variable: {
                name: currentPart.variable,
                value: nextColor
            }
        });
    }

    function resetColor() {
        if (!currentPart) return;

        const update = {
            variable: {
                name: currentPart.variable,
                value: currentPart.defaultColor
            }
        };

        // Reset texture to WDB default (equivalent to WriteDefaultTexture in the game)
        if (canEditTexture && wdbTexture && renderer) {
            const texKey = textureInfo.textureName.toLowerCase();
            const saveData = squareTexture(wdbTexture);

            renderer.updateTexture(texKey, saveData);

            update.texture = {
                textureName: textureInfo.textureName,
                textureData: saveData
            };
        }

        onUpdate(update);
    }

    function openTexturePicker() {
        if (!canEditTexture) return;
        showTextureModal = true;
    }

    function handleTextureSelect(textureData) {
        if (!textureInfo || !renderer) return;

        const texKey = textureInfo.textureName.toLowerCase();

        // Square the texture for game compatibility — the game's DirectDraw
        // surfaces are always square, and LoadBits() expects matching dimensions.
        // No-op if already square.
        const saveData = squareTexture(textureData);

        // Update preview immediately
        renderer.updateTexture(texKey, saveData);

        // Save to file
        onUpdate({
            texture: {
                textureName: textureInfo.textureName,
                textureData: saveData
            }
        });

        showTextureModal = false;
    }

</script>

<EditorTooltip text="Click on the part to cycle through colors. Use the texture button to customize textures on supported parts (vehicle must be fully built first). Changes are automatically saved.">
    <!-- 3D Preview (clickable to cycle color) -->
    <div class="preview-container">
        <canvas
            bind:this={canvas}
            width="190"
            height="190"
            class:hidden={loading || error}
            onclick={cycleColor}
            role="button"
            tabindex="0"
            aria-label="Click to change color"
        ></canvas>

        {#if loading}
            <div class="preview-overlay">
                <div class="spinner"></div>
            </div>
        {:else if error}
            <div class="preview-overlay error">{error}</div>
        {:else if partError}
            <div class="preview-overlay error">{partError}</div>
        {/if}
    </div>

    <!-- Part navigation below canvas -->
    <div class="part-nav-wrapper">
        <div class="part-nav">
            <NavButton direction="left" onclick={prevPart} />
            <div class="part-info">
                <span class="vehicle-name">{VehicleNames[vehicle]}</span>
                <span class="part-name">{currentPart?.label || 'Unknown'}</span>
            </div>
            <NavButton direction="right" onclick={nextPart} />
        </div>
        {#if textureInfo}
            <button
                type="button"
                class="texture-btn"
                class:disabled={!canEditTexture}
                onclick={openTexturePicker}
                disabled={!canEditTexture}
                title={canEditTexture ? 'Edit texture' : 'Vehicle not placed in world'}
            >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14.5 2.5a1.5 1.5 0 0 0-3 0v1h-2v-1a1.5 1.5 0 0 0-3 0v1h-2v-1a1.5 1.5 0 0 0-3 0v2h1v2h-1v2h1v2h-1v2a1.5 1.5 0 0 0 3 0v-1h2v1a1.5 1.5 0 0 0 3 0v-1h2v1a1.5 1.5 0 0 0 3 0v-2h-1v-2h1v-2h-1v-2h1v-2zm-3 2h-2v2h2v-2zm-5 0h-2v2h2v-2zm0 4h-2v2h2v-2zm5 0h-2v2h2v-2z"/>
                </svg>
            </button>
        {/if}
    </div>

    <div class="reset-container">
        {#if (!isDefaultColor || !isDefaultTexture) && !loading && !error && !partError}
            <ResetButton onclick={resetColor} />
        {/if}
    </div>
</EditorTooltip>

{#if showTextureModal && textureInfo}
    <TexturePickerModal
        {textureInfo}
        palette={texturePalette}
        defaults={preloadedDefaults}
        onSelect={handleTextureSelect}
        onClose={() => showTextureModal = false}
    />
{/if}

<style>
    .preview-container {
        position: relative;
    }

    canvas {
        display: block;
        border-radius: 8px;
        cursor: pointer;
        max-width: 100%;
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
        min-width: 100px;
    }

    .vehicle-name {
        display: block;
        font-size: 0.7em;
        color: var(--color-text-muted);
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .part-name {
        display: block;
        font-size: 0.9em;
        color: var(--color-text-light);
    }

    .reset-container {
        height: 1.6em;
    }

    .texture-btn {
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

    .texture-btn:hover:not(.disabled) {
        border-color: var(--color-primary);
        color: var(--color-primary);
    }

    .texture-btn.disabled {
        opacity: 0.35;
        cursor: not-allowed;
    }
</style>
