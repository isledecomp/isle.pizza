<script>
    import { ActorNames } from '../../core/savegame/constants.js';

    export let slot;
    export let selected = false;
    export let onClick = () => {};

    $: actorName = slot.header?.actorId ? ActorNames[slot.header.actorId] : 'None';
    $: actNumber = (slot.header?.currentAct ?? 0) + 1;
    $: playerName = slot.playerName || 'Unknown';
</script>

<button
    class="save-slot-card"
    class:selected
    onclick={onClick}
    type="button"
>
    <div class="slot-header">
        <span class="slot-number">Slot {slot.slotNumber}</span>
        <span class="player-name">{playerName}</span>
    </div>
    <div class="slot-info">
        <span class="actor">{actorName}</span>
        <span class="act">Act {actNumber}</span>
    </div>
</button>

<style>
    .save-slot-card {
        display: flex;
        flex-direction: column;
        padding: 12px 16px;
        background: var(--color-bg-panel);
        border: 2px solid var(--color-border-dark);
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: left;
        font-family: inherit;
    }

    .save-slot-card:hover {
        border-color: var(--color-border-light);
        background: var(--gradient-hover);
    }

    .save-slot-card.selected {
        border-color: var(--color-primary);
        box-shadow: 0 0 10px var(--color-primary-glow);
    }

    .slot-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }

    .slot-number {
        color: var(--color-text-muted);
        font-size: 0.8em;
    }

    .player-name {
        color: var(--color-primary);
        font-weight: bold;
        font-size: 0.95em;
    }

    .slot-info {
        display: flex;
        justify-content: space-between;
        color: var(--color-text-medium);
        font-size: 0.85em;
    }
</style>
