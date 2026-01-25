<script>
    import { onMount } from 'svelte';
    import BackButton from './BackButton.svelte';
    import SaveSlotList from './save-editor/SaveSlotList.svelte';
    import PlayerInfoEditor from './save-editor/PlayerInfoEditor.svelte';
    import MissionScoresEditor from './save-editor/MissionScoresEditor.svelte';
    import { saveEditorState, configToastVisible } from '../stores.js';
    import { listSaveSlots, updateSaveSlot } from '../core/savegame/index.js';

    let loading = true;
    let error = null;
    let slots = [];
    let selectedSlot = null;

    onMount(async () => {
        await loadSlots();
    });

    async function loadSlots() {
        loading = true;
        error = null;

        try {
            slots = await listSaveSlots();
            saveEditorState.update(s => ({ ...s, slots, loading: false, error: null }));
        } catch (e) {
            error = e.message;
            saveEditorState.update(s => ({ ...s, loading: false, error: e.message }));
        } finally {
            loading = false;
        }
    }

    function handleSlotSelect(slotNumber) {
        selectedSlot = slotNumber;
        saveEditorState.update(s => ({ ...s, selectedSlot: slotNumber }));
    }

    async function handleHeaderUpdate(updates) {
        if (selectedSlot === null) return;

        try {
            const updated = await updateSaveSlot(selectedSlot, { header: updates });
            if (updated) {
                // Update the slot in our list
                slots = slots.map(s =>
                    s.slotNumber === selectedSlot
                        ? { ...s, header: updated.header }
                        : s
                );
            }
        } catch (e) {
            console.error('Failed to update save:', e);
        }
    }

    async function handleMissionUpdate(missionUpdate) {
        if (selectedSlot === null) return;

        try {
            const updated = await updateSaveSlot(selectedSlot, { missionScore: missionUpdate });
            if (updated) {
                // Update the slot in our list
                slots = slots.map(s =>
                    s.slotNumber === selectedSlot
                        ? { ...s, missions: updated.missions }
                        : s
                );
            }
        } catch (e) {
            console.error('Failed to update mission score:', e);
        }
    }

    function handleNameUpdate(newName) {
        // Update the slot's playerName in our list
        slots = slots.map(s =>
            s.slotNumber === selectedSlot
                ? { ...s, playerName: newName }
                : s
        );
    }

    $: existingSlots = slots.filter(s => s.exists);
    $: currentSlot = slots.find(s => s.slotNumber === selectedSlot);
</script>

<div id="save-editor-page" class="page-content">
    <BackButton />
    <div class="page-inner-content save-editor-layout">
        <h1>Save Editor</h1>

        {#if loading}
            <div class="save-editor-status">
                <p>Loading save files...</p>
            </div>
        {:else if error}
            <div class="save-editor-status error">
                <p>Error: {error}</p>
            </div>
        {:else if existingSlots.length === 0}
            <div class="save-editor-status">
                <p>No save files found. Start a new game to create a save file.</p>
            </div>
        {:else}
            <div class="save-editor-content">
                <SaveSlotList
                    {slots}
                    {selectedSlot}
                    onSelect={handleSlotSelect}
                />

                {#if currentSlot && currentSlot.exists}
                    <div class="save-editor-details">
                        <PlayerInfoEditor
                            slot={currentSlot}
                            onUpdate={handleHeaderUpdate}
                            onNameUpdate={handleNameUpdate}
                        />
                        <MissionScoresEditor
                            slot={currentSlot}
                            onUpdate={handleMissionUpdate}
                        />
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    .save-editor-layout {
        max-width: 900px;
    }

    .save-editor-layout h1 {
        color: var(--color-primary);
        font-size: 2em;
        margin-bottom: 24px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    .save-editor-status {
        text-align: center;
        padding: 40px;
        color: var(--color-text-muted);
        background: var(--gradient-panel);
        border: 1px solid var(--color-border-dark);
        border-radius: 8px;
    }

    .save-editor-status.error {
        color: #ff6b6b;
        border-color: #ff6b6b;
    }

    .save-editor-content {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .save-editor-details {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
</style>
