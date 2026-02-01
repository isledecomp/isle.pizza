<script>
    import ResetButton from '../ResetButton.svelte';

    export let slot;
    export let onUpdate = () => {};

    // Default light position (game default is "2")
    const DEFAULT_POSITION = 2;

    // Get current position from slot's lightposition variable
    $: lightVar = slot?.variables?.get('lightposition');
    $: currentPosition = lightVar ? parseInt(lightVar.value, 10) : DEFAULT_POSITION;

    // Globe images for each position (0-5 map to globe1-globe6)
    const positions = [0, 1, 2, 3, 4, 5];

    function handleSelect(position) {
        onUpdate({
            variable: {
                name: 'lightposition',
                value: String(position)
            }
        });
    }

    function handleReset() {
        handleSelect(DEFAULT_POSITION);
    }

    $: isDefault = currentPosition === DEFAULT_POSITION;
</script>

<div class="light-position-editor">
    <div class="globe-grid">
        {#each positions as position}
            <button
                type="button"
                class="globe-btn"
                class:selected={currentPosition === position}
                onclick={() => handleSelect(position)}
                title="Position {position}"
            >
                <img
                    src="globe{position + 1}.webp"
                    alt="Light position {position}"
                />
            </button>
        {/each}
    </div>
    {#if !isDefault}
        <ResetButton onclick={handleReset} />
    {/if}
</div>

<style>
    .light-position-editor {
        padding-top: 4px;
    }

    .globe-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
    }

    .globe-btn {
        padding: 4px;
        background: var(--color-bg-input);
        border: 2px solid var(--color-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .globe-btn:hover {
        border-color: var(--color-border-light);
    }

    .globe-btn.selected {
        border-color: var(--color-primary);
    }

    .globe-btn img {
        width: 48px;
        height: 48px;
        display: block;
        image-rendering: pixelated;
    }

    @media (max-width: 400px) {
        .globe-btn img {
            width: 40px;
            height: 40px;
        }
    }
</style>
