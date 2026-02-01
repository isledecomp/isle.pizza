<script>
    import { onMount, onDestroy } from 'svelte';
    import { VehiclePartRenderer } from '../../core/rendering/VehiclePartRenderer.js';
    import { WdbParser, findRoi, buildPartsMap } from '../../core/formats/WdbParser.js';
    import {
        LegoColorNames,
        VehicleWorlds,
        VehicleModels,
        VehicleNames,
        VehiclePartColors
    } from '../../core/savegame/constants.js';
    import NavButton from '../NavButton.svelte';
    import ResetButton from '../ResetButton.svelte';

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

    // Current part info from flat list
    $: currentEntry = allParts[globalIndex];
    $: vehicle = currentEntry?.vehicle || 'dunebuggy';
    $: currentPart = currentEntry;

    // Get current color from slot variables
    $: currentColorValue = currentPart
        ? slot?.variables?.get(currentPart.variable)?.value || currentPart.defaultColor
        : 'lego red';

    // Check if current color differs from default
    $: isDefault = currentPart && currentColorValue === currentPart.defaultColor;

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

    // Reload part when index changes
    $: if (renderer && !loading && currentPart) {
        const partKey = `${vehicle}-${globalIndex}`;
        if (partKey !== loadedPartKey) {
            loadCurrentPart();
        }
    }

    // Update color when variable changes (without reloading geometry)
    $: if (renderer && !loading && currentColorValue && loadedPartKey) {
        renderer.updateColor(currentColorValue);
    }

    async function loadCurrentPart() {
        if (!wdbData || !wdbParser || !currentPart || !renderer) return;

        partError = null;
        const partKey = `${vehicle}-${globalIndex}`;

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

            // Load part with current color, textures, and parts map for shared LOD lookup
            renderer.loadPartWithColor(partRoi, currentColorValue, modelData.textures || [], partsMap);
            loadedPartKey = partKey;
        } catch (e) {
            console.error('Failed to load part:', e);
            partError = e.message;
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

        onUpdate({
            variable: {
                name: currentPart.variable,
                value: currentPart.defaultColor
            }
        });
    }

</script>

<div class="vehicle-editor">
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
    <div class="part-nav">
        <NavButton direction="left" onclick={prevPart} />
        <div class="part-info">
            <span class="vehicle-name">{VehicleNames[vehicle]}</span>
            <span class="part-name">{currentPart?.label || 'Unknown'}</span>
        </div>
        <NavButton direction="right" onclick={nextPart} />
    </div>

    <div class="reset-container">
        {#if !isDefault && !loading && !error && !partError}
            <ResetButton onclick={resetColor} />
        {/if}
    </div>
</div>

<style>
    .vehicle-editor {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

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

    .part-nav {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 10px;
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
</style>
