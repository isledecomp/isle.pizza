<script>
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
    <ScoreCube
        missions={missionData}
        onUpdate={handleCubeUpdate}
    />
</div>

<style>
    .scores-editor {
        display: flex;
        justify-content: center;
    }
</style>
