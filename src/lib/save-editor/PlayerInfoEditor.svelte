<script>
    import { Actor, ActorNames } from '../../core/savegame/constants.js';
    import { updatePlayerName } from '../../core/savegame/index.js';

    export let slot;
    export let onUpdate = () => {};
    export let onNameUpdate = () => {};

    // Local state for form values
    let currentAct = slot?.header?.currentAct ?? 0;
    let actorId = slot?.header?.actorId ?? 1;

    // Name slots (7 characters)
    let nameSlots = ['', '', '', '', '', '', ''];
    let slotRefs = [];

    // Update local state when slot changes
    $: if (slot?.header) {
        currentAct = slot.header.currentAct;
        actorId = slot.header.actorId;
    }

    // Update name slots when player name changes
    $: if (slot?.playerName) {
        const name = slot.playerName.toUpperCase();
        nameSlots = Array.from({ length: 7 }, (_, i) => name[i] || '');
    }

    function handleActChange(e) {
        currentAct = parseInt(e.target.value);
        onUpdate({ currentAct });
    }

    function handleActorChange(e) {
        actorId = parseInt(e.target.value);
        onUpdate({ actorId });
    }

    async function saveNameFromSlots() {
        const newName = nameSlots.join('').replace(/[^A-Z]/g, '');
        if (newName.length === 0) return;

        const success = await updatePlayerName(slot.slotNumber, newName);
        if (success) {
            onNameUpdate(newName);
        }
    }

    function handleSlotBeforeInput(index, e) {
        // Allow deletions
        if (!e.data) return;

        // Only allow A-Z (case insensitive)
        const char = e.data.toUpperCase();
        if (!/^[A-Z]$/.test(char)) {
            e.preventDefault();
            return;
        }

        // Prevent default and handle manually for better control
        e.preventDefault();

        nameSlots[index] = char;
        nameSlots = [...nameSlots];

        // Auto-save
        saveNameFromSlots();

        // Move to next slot
        if (index < 6) {
            slotRefs[index + 1]?.focus();
        }
    }

    function getFilledCount() {
        return nameSlots.filter(c => c !== '').length;
    }

    function handleSlotKeydown(index, e) {
        if (e.key === 'Backspace') {
            if (nameSlots[index] === '' && index > 0) {
                // Move to previous slot and clear it (if not the last character)
                if (getFilledCount() > 1 || nameSlots[index - 1] === '') {
                    slotRefs[index - 1]?.focus();
                    if (nameSlots[index - 1] !== '' && getFilledCount() > 1) {
                        nameSlots[index - 1] = '';
                        nameSlots = [...nameSlots];
                        saveNameFromSlots();
                    }
                }
                e.preventDefault();
            } else if (nameSlots[index] !== '') {
                // Clear current slot only if not the last character
                if (getFilledCount() > 1) {
                    nameSlots[index] = '';
                    nameSlots = [...nameSlots];
                    saveNameFromSlots();
                }
                e.preventDefault();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            slotRefs[index - 1]?.focus();
            e.preventDefault();
        } else if (e.key === 'ArrowRight' && index < 6) {
            slotRefs[index + 1]?.focus();
            e.preventDefault();
        } else if (e.key === 'Delete') {
            // Only delete if not the last character
            if (getFilledCount() > 1 && nameSlots[index] !== '') {
                nameSlots[index] = '';
                nameSlots = [...nameSlots];
                saveNameFromSlots();
            }
            e.preventDefault();
        }
    }

    function handleSlotFocus(e) {
        e.target.select();
    }

    // Get actor options (excluding NONE)
    const actorOptions = [
        { id: Actor.PEPPER, name: ActorNames[Actor.PEPPER] },
        { id: Actor.MAMA, name: ActorNames[Actor.MAMA] },
        { id: Actor.PAPA, name: ActorNames[Actor.PAPA] },
        { id: Actor.NICK, name: ActorNames[Actor.NICK] },
        { id: Actor.LAURA, name: ActorNames[Actor.LAURA] }
    ];
</script>

<div class="player-info-editor">
    <h3 class="section-title">Player Info</h3>

    <div class="info-row">
        <span class="row-label">Name</span>
        <div class="name-slots">
            {#each nameSlots as char, i}
                <input
                    type="text"
                    class="name-slot"
                    value={char}
                    maxlength="1"
                    onbeforeinput={(e) => handleSlotBeforeInput(i, e)}
                    onkeydown={(e) => handleSlotKeydown(i, e)}
                    onfocus={handleSlotFocus}
                    bind:this={slotRefs[i]}
                />
            {/each}
        </div>
    </div>

    <div class="info-row">
        <label class="row-label" for="act-select">Act</label>
        <div class="select-wrapper">
            <select id="act-select" value={currentAct} onchange={handleActChange}>
                <option value={0}>Act 1</option>
                <option value={1}>Act 2</option>
                <option value={2}>Act 3</option>
            </select>
        </div>
    </div>

    <div class="info-row">
        <label class="row-label" for="actor-select">Character</label>
        <div class="select-wrapper">
            <select id="actor-select" value={actorId} onchange={handleActorChange}>
                {#each actorOptions as actor}
                    <option value={actor.id}>{actor.name}</option>
                {/each}
            </select>
        </div>
    </div>
</div>

<style>
    .player-info-editor {
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-dark);
        border-radius: 8px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .section-title {
        color: var(--color-primary);
        font-size: 1.1em;
        margin: 0;
    }

    .info-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .row-label {
        color: var(--color-text-medium);
        font-size: 0.9em;
        min-width: 70px;
    }

    .name-slots {
        display: flex;
        gap: 4px;
        flex: 1;
    }

    .name-slot {
        width: 36px;
        height: 36px;
        text-align: center;
        font-size: 1em;
        font-weight: bold;
        font-family: inherit;
        text-transform: uppercase;
        background: var(--color-bg-input);
        border: 1px solid var(--color-border-medium);
        border-radius: 4px;
        color: var(--color-text-light);
        padding: 0;
        flex-shrink: 0;
    }

    .name-slot:focus {
        outline: none;
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.2);
    }

    .name-slot:hover {
        border-color: var(--color-border-light);
    }

    .select-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        flex: 1;
        max-width: 200px;
    }

    .select-wrapper::after {
        content: '\25BC';
        position: absolute;
        right: 10px;
        pointer-events: none;
        color: var(--color-text-medium);
        font-size: 0.7em;
    }

    select {
        width: 100%;
        background-color: var(--color-bg-input);
        color: var(--color-text-light);
        border: 1px solid var(--color-border-medium);
        padding: 8px 30px 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        appearance: none;
        font-size: 0.9em;
        font-family: inherit;
    }

    select:hover {
        border-color: var(--color-border-light);
    }

    select:focus {
        outline: none;
        border-color: var(--color-primary);
    }

    @media (max-width: 400px) {
        .info-row {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
        }

        .row-label {
            min-width: unset;
        }

        .select-wrapper {
            max-width: none;
            width: 100%;
        }

        .name-slot {
            width: 32px;
            height: 32px;
            font-size: 0.9em;
        }
    }
</style>
