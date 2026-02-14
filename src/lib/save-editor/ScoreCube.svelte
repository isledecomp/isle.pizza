<script>
    import { onMount, onDestroy } from 'svelte';
    import { ScoreCubeRenderer } from '../../core/rendering/ScoreCubeRenderer.js';
    import { WdbParser, findRoi } from '../../core/formats/WdbParser.js';
    import EditorTooltip from '../EditorTooltip.svelte';

    export let missions = {};
    export let onUpdate = () => {};

    let canvas;
    let renderer = null;
    let loading = true;
    let error = null;

    // Activity keys in order matching cube layout (left to right)
    // Car Race, Jetski Race, Pizza, Tow Track, Ambulance
    const activities = ['carRace', 'jetskiRace', 'pizza', 'towTrack', 'ambulance'];

    onMount(async () => {
        try {
            // Load and parse WDB
            const response = await fetch('/LEGO/data/WORLD.WDB');
            if (!response.ok) {
                throw new Error(`Failed to load WORLD.WDB: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const parser = new WdbParser(buffer);
            const wdb = parser.parse();

            // Find ICUBE world and scormain model
            const icubeWorld = wdb.worlds.find(w => w.name === 'ICUBE');
            if (!icubeWorld) {
                throw new Error('ICUBE world not found in WDB');
            }

            const scormainModel = icubeWorld.models.find(m =>
                m.name.toLowerCase().includes('scormain')
            );
            if (!scormainModel) {
                throw new Error('scormain model not found in ICUBE world');
            }

            // Parse the model_data blob
            const modelData = parser.parseModelData(scormainModel.dataOffset);

            // Find scorcube ROI
            const scorcubeRoi = findRoi(modelData.roi, 'scorcube');
            if (!scorcubeRoi) {
                throw new Error('scorcube ROI not found');
            }

            // Find bigcube texture
            const bigcubeTexture = modelData.textures.find(t =>
                t.name.toLowerCase() === 'bigcube.gif'
            );
            if (!bigcubeTexture) {
                throw new Error('bigcube.gif texture not found');
            }

            // Initialize renderer
            renderer = new ScoreCubeRenderer(canvas);
            renderer.loadModel(scorcubeRoi, bigcubeTexture);
            renderer.updateScores(convertScores(missions));
            renderer.start();

            loading = false;
        } catch (e) {
            console.error('ScoreCube initialization error:', e);
            error = e.message;
            loading = false;
        }
    });

    onDestroy(() => {
        renderer?.dispose();
    });

    // Reactive score updates
    $: if (renderer && !loading) {
        renderer.updateScores(convertScores(missions));
    }

    /**
     * Convert mission data format to 2D score array
     * Input: { pizza: { highScores: { 1: val, 2: val, ... } }, ... }
     * Output: [[actor0 scores], [actor1 scores], ...]
     */
    function convertScores(missionData) {
        const result = [];
        for (let actor = 0; actor < 5; actor++) {
            result[actor] = [];
            for (let activity = 0; activity < 5; activity++) {
                const missionKey = activities[activity];
                // Actor IDs are 1-indexed in the save data
                result[actor][activity] = missionData?.[missionKey]?.highScores?.[actor + 1] ?? 0;
            }
        }
        return result;
    }

    function handleClick(event) {
        if (!renderer || loading) return;
        if (renderer.wasDragged()) return;

        const hit = renderer.raycast(event);
        if (hit) {
            const missionKey = activities[hit.activity];
            const actorId = hit.actor + 1; // Convert to 1-indexed

            // Get current score and cycle to next
            const currentScore = missions?.[missionKey]?.highScores?.[actorId] ?? 0;
            const newScore = (currentScore + 1) % 4;

            onUpdate({
                missionType: missionKey,
                actorId,
                scoreType: 'highScore',
                value: newScore
            });
        }
    }
</script>

<EditorTooltip text="Click on the cube to cycle high scores. Changes are automatically saved.">
    <div class="score-cube-container">
        <canvas
            bind:this={canvas}
            width="200"
            height="200"
            onclick={handleClick}
            class:hidden={loading || error}
            role="button"
            tabindex="0"
            aria-label="Score cube - click to edit scores"
        ></canvas>

        {#if loading}
            <div class="overlay">
                <div class="spinner"></div>
            </div>
        {:else if error}
            <div class="overlay error">Error: {error}</div>
        {/if}
    </div>
</EditorTooltip>

<style>
    .score-cube-container {
        position: relative;
        min-width: 0;
        margin-top: 16px;
    }

    canvas {
        cursor: grab;
        border-radius: 8px;
        margin-bottom: 12px;
        max-width: 100%;
    }

    canvas:active {
        cursor: grabbing;
    }

    canvas.hidden {
        visibility: hidden;
        position: absolute;
    }

    canvas:focus {
        outline: none;
    }

    .overlay {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 200px;
        height: 200px;
        max-width: 100%;
        padding-top: 20px;
        color: var(--color-text-muted, #888);
        font-size: 0.9em;
    }

    .overlay.error {
        background: var(--color-bg-secondary, #1a1a2e);
        border-radius: 8px;
        color: var(--color-error, #e74c3c);
        padding: 16px;
        text-align: center;
    }

    .spinner {
        width: 50px;
        height: 50px;
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
</style>
