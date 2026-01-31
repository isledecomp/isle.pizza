<script>
    import { currentPage } from '../../stores.js';
    import ScoreCube from './ScoreCube.svelte';

    export let slot;
    export let onUpdate = () => {};

    // Reactive mission data - re-evaluated when slot changes
    $: missionData = slot?.missions || {};

    function handleCubeUpdate(update) {
        onUpdate(update);
    }
</script>

<div class="scores-editor">
    {#if $currentPage === 'save-editor'}
        <ScoreCube
            missions={missionData}
            onUpdate={handleCubeUpdate}
        />
    {/if}
</div>

<style>
    .scores-editor {
        display: flex;
        justify-content: center;
        max-width: 100%;
    }
</style>
