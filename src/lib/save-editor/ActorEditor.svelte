<script>
    import { onMount, onDestroy } from 'svelte';
    import { ActorRenderer } from '../../core/rendering/ActorRenderer.js';
    import { WdbParser, buildGlobalPartsMap } from '../../core/formats/WdbParser.js';
    import { ActorInfoInit, ActorPart, ActorPartLabels, colorAliases,
        CharacterFieldOffsets } from '../../core/savegame/actorConstants.js';
    import { Actor } from '../../core/savegame/constants.js';
    import NavButton from '../NavButton.svelte';
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

    let actorIndex = 0;
    let loadedActorKey = null;

    $: actorInfo = ActorInfoInit[actorIndex];
    $: actorName = actorInfo?.name || 'Unknown';
    $: charState = slot?.characters?.[actorIndex];


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
    });

    // Reload actor when index or character state changes
    $: if (renderer && !loading && actorInfo && charState) {
        const cs = charState;
        const key = `${slot?.slotNumber}-${actorIndex}-${cs.hatPartNameIndex}-${cs.hatNameIndex}-${cs.infogronNameIndex}-${cs.armlftNameIndex}-${cs.armrtNameIndex}-${cs.leglftNameIndex}-${cs.legrtNameIndex}-${cs.move}-${cs.sound}`;
        if (key !== loadedActorKey) {
            loadCurrentActor();
        }
    }

    function loadCurrentActor() {
        if (!renderer || !globalPartsMap || !slot?.characters) return;

        renderer.loadActor(actorIndex, slot.characters, globalPartsMap, globalTextures);
        const cs = slot.characters[actorIndex];
        loadedActorKey = `${slot?.slotNumber}-${actorIndex}-${cs.hatPartNameIndex}-${cs.hatNameIndex}-${cs.infogronNameIndex}-${cs.armlftNameIndex}-${cs.armrtNameIndex}-${cs.leglftNameIndex}-${cs.legrtNameIndex}-${cs.move}-${cs.sound}`;
    }

    function prevActor() {
        actorIndex = actorIndex > 0 ? actorIndex - 1 : ActorInfoInit.length - 1;
        loadedActorKey = null;
    }

    function nextActor() {
        actorIndex = actorIndex < ActorInfoInit.length - 1 ? actorIndex + 1 : 0;
        loadedActorKey = null;
    }

    function handleCanvasClick(event) {
        if (!renderer || !slot?.characters || !charState) return;

        const playerId = slot.header?.actorId;

        switch (playerId) {
            case Actor.PEPPER:
                switchVariant();
                break;
            case Actor.MAMA:
                switchSound();
                break;
            case Actor.PAPA:
                switchMove();
                break;
            case Actor.NICK:
                switchColor(event);
                break;
            case Actor.LAURA:
                switchMood();
                break;
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
        const nextSound = (charState.sound + 1) % 4;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'sound', value: nextSound }
        });
    }

    function switchMove() {
        const nextMove = (charState.move + 1) % 4;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'move', value: nextMove }
        });
    }

    function switchColor(event) {
        const partIdx = renderer.getClickedPart(event);
        if (partIdx < 0) return;

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
        if (!field) return; // Body (0) and Head (3) don't have color fields

        const part = actorInfo.parts[partIdx];
        if (!part.nameIndices) return;

        const currentIdx = charState[field] ?? part.nameIndex;
        const maxIdx = part.nameIndices.length;
        const nextIdx = (currentIdx + 1) % maxIdx;

        onUpdate({
            character: { characterIndex: actorIndex, field, value: nextIdx }
        });
    }

    function switchMood() {
        const nextMood = (charState.mood + 1) % 4;
        onUpdate({
            character: { characterIndex: actorIndex, field: 'mood', value: nextMood }
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
    </div>
</EditorTooltip>

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
</style>
