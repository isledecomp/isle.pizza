<script>
    import SaveSlotCard from './SaveSlotCard.svelte';

    export let slots = [];
    export let selectedSlot = null;
    export let onSelect = () => {};

    $: existingSlots = slots.filter(s => s.exists);
</script>

<div class="save-slot-list">
    <h2 class="section-title">Save Slots</h2>
    {#if existingSlots.length === 0}
        <p class="no-slots">No save files found</p>
    {:else}
        <div class="slot-grid">
            {#each existingSlots as slot}
                <SaveSlotCard
                    {slot}
                    selected={selectedSlot === slot.slotNumber}
                    onClick={() => onSelect(slot.slotNumber)}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    .save-slot-list {
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-dark);
        border-radius: 8px;
        padding: 16px;
    }

    .section-title {
        color: var(--color-primary);
        font-size: 1.1em;
        margin: 0 0 16px 0;
    }

    .slot-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
    }

    .no-slots {
        color: var(--color-text-muted);
        text-align: center;
        padding: 20px;
        margin: 0;
    }
</style>
