<script>
    import { onMount } from 'svelte';
    import BackButton from './BackButton.svelte';
    import MissionScoresEditor from './save-editor/MissionScoresEditor.svelte';
    import { saveEditorState, currentPage } from '../stores.js';
    import { listSaveSlots, updateSaveSlot, updatePlayerName } from '../core/savegame/index.js';
    import { Actor, ActorNames } from '../core/savegame/constants.js';

    let loading = true;
    let error = null;
    let slots = [];
    let selectedSlot = null;

    // Tab state
    let activeTab = 'player';
    let openSection = 'name';

    const saveTabs = [
        { id: 'player', label: 'Player', firstSection: 'name' },
        { id: 'scores', label: 'Scores', firstSection: null }
    ];

    // Reset to default tab/section when navigating to this page
    $: if ($currentPage === 'save-editor') {
        activeTab = 'player';
        openSection = 'name';
    }

    // Name editing state (7 characters)
    let nameSlots = ['', '', '', '', '', '', ''];
    let slotRefs = [];

    // Character/Act state
    let currentAct = 0;
    let actorId = 1;

    // Character icons mapping
    const characterIcons = {
        [Actor.PEPPER]: { normal: 'pepper.webp', selected: 'pepper-selected.webp' },
        [Actor.MAMA]: { normal: 'mama.webp', selected: 'mama-selected.webp' },
        [Actor.PAPA]: { normal: 'papa.webp', selected: 'papa-selected.webp' },
        [Actor.NICK]: { normal: 'nick.webp', selected: 'nick-selected.webp' },
        [Actor.LAURA]: { normal: 'laura.webp', selected: 'laura-selected.webp' }
    };

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

    // Tab/section functions
    function switchTab(tab) {
        activeTab = tab.id;
        openSection = tab.firstSection;
    }

    function toggleSection(sectionId) {
        openSection = openSection === sectionId ? null : sectionId;
    }

    // Name editing functions
    async function saveNameFromSlots() {
        const newName = nameSlots.join('').replace(/[^A-Z]/g, '');
        if (newName.length === 0) return;

        const success = await updatePlayerName(currentSlot.slotNumber, newName);
        if (success) {
            slots = slots.map(s =>
                s.slotNumber === selectedSlot
                    ? { ...s, playerName: newName }
                    : s
            );
        }
    }

    function handleSlotBeforeInput(index, e) {
        if (!e.data) return;

        const char = e.data.toUpperCase();
        if (!/^[A-Z]$/.test(char)) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        nameSlots[index] = char;
        nameSlots = [...nameSlots];
        saveNameFromSlots();

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

    // Character handler
    function handleActorSelect(id) {
        actorId = id;
        handleHeaderUpdate({ actorId: id });
    }

    // Actor options (ordered: Mama, Papa, Pepper, Nick, Laura)
    const actorOptions = [
        { id: Actor.MAMA, name: ActorNames[Actor.MAMA] },
        { id: Actor.PAPA, name: ActorNames[Actor.PAPA] },
        { id: Actor.PEPPER, name: ActorNames[Actor.PEPPER] },
        { id: Actor.NICK, name: ActorNames[Actor.NICK] },
        { id: Actor.LAURA, name: ActorNames[Actor.LAURA] }
    ];

    $: existingSlots = slots.filter(s => s.exists);
    $: currentSlot = slots.find(s => s.slotNumber === selectedSlot);

    // Update local state when currentSlot changes
    $: if (currentSlot?.header) {
        currentAct = currentSlot.header.currentAct;
        actorId = currentSlot.header.actorId;
    }

    // Update name slots when player name changes
    $: if (currentSlot?.playerName) {
        const name = currentSlot.playerName.toUpperCase();
        nameSlots = Array.from({ length: 7 }, (_, i) => name[i] || '');
    }
</script>

<div id="save-editor" class="page-content">
    <BackButton />
    <div class="page-inner-content config-layout">
        <div class="config-art-panel">
            <img src="save.webp" alt="LEGO Island Save Editor">
        </div>
        <div class="config-main">
            <div class="config-presets">
                {#if loading}
                    <span class="save-status-text">Loading save files...</span>
                {:else if error}
                    <span class="save-status-text error">{error}</span>
                {:else if existingSlots.length === 0}
                    <span class="save-status-text">No save files found</span>
                {:else}
                    {#each existingSlots as slot}
                        <button
                            type="button"
                            class="save-slot-card"
                            class:selected={selectedSlot === slot.slotNumber}
                            onclick={() => handleSlotSelect(slot.slotNumber)}
                        >
                            <img
                                src={characterIcons[slot.header?.actorId]?.selected || 'pepper-selected.webp'}
                                alt={ActorNames[slot.header?.actorId] || 'Character'}
                                class="slot-character-icon"
                            />
                            <span class="slot-name">{slot.playerName}</span>
                        </button>
                    {/each}
                {/if}
            </div>

            {#if currentSlot && currentSlot.exists}
                <div class="config-tabs">
                    <div class="config-tab-buttons">
                        {#each saveTabs as tab}
                            <button
                                class="config-tab-btn"
                                class:active={activeTab === tab.id}
                                onclick={() => switchTab(tab)}
                            >
                                {tab.label}
                            </button>
                        {/each}
                    </div>

                    <!-- Player Tab -->
                    <div class:hidden={activeTab !== 'player'}>
                        <div class="config-section-card">
                            <button type="button" class="config-card-header" onclick={() => toggleSection('name')}>
                                Name
                            </button>
                            <div class="config-card-content" class:open={openSection === 'name'}>
                                <div class="section-inner">
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
                            </div>
                        </div>

                        <div class="config-section-card">
                            <button type="button" class="config-card-header" onclick={() => toggleSection('character')}>
                                Character
                            </button>
                            <div class="config-card-content" class:open={openSection === 'character'}>
                                <div class="section-inner">
                                    <div class="character-icons">
                                        {#each actorOptions as actor}
                                            <button
                                                type="button"
                                                class="character-icon-btn"
                                                class:selected={actorId === actor.id}
                                                onclick={() => handleActorSelect(actor.id)}
                                                title={actor.name}
                                            >
                                                <img
                                                    src={actorId === actor.id
                                                        ? characterIcons[actor.id].selected
                                                        : characterIcons[actor.id].normal}
                                                    alt={actor.name}
                                                />
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Scores Tab -->
                    <div class:hidden={activeTab !== 'scores'}>
                        <MissionScoresEditor
                            slot={currentSlot}
                            onUpdate={handleMissionUpdate}
                        />
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .save-status-text {
        color: var(--color-text-muted);
        font-size: 0.9em;
        padding: 8px 0;
    }

    .save-status-text.error {
        color: #ff6b6b;
    }

    .save-slot-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        min-width: 85px;
        background: var(--gradient-panel);
        border: 2px solid var(--color-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .save-slot-card:hover {
        border-color: var(--color-border-light);
        background: var(--gradient-hover);
    }

    .save-slot-card.selected {
        border-color: var(--color-primary);
        box-shadow: 0 0 8px var(--color-primary-glow);
    }

    .slot-character-icon {
        width: 32px;
        height: 37px;
        image-rendering: pixelated;
    }

    .slot-name {
        color: var(--color-text-light);
        font-size: 0.75em;
        font-weight: bold;
    }

    .section-inner {
        padding-top: 4px;
    }

    .name-slots {
        display: flex;
        gap: 4px;
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

    .character-icons {
        display: flex;
        gap: 4px;
    }

    .character-icon-btn {
        padding: 4px;
        background: var(--color-bg-input);
        border: 2px solid var(--color-border-medium);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
    }

    .character-icon-btn:hover {
        border-color: var(--color-border-light);
    }

    .character-icon-btn.selected {
        border-color: var(--color-primary);
    }

    .character-icon-btn img {
        width: 40px;
        height: 46px;
        display: block;
        image-rendering: pixelated;
    }

    @media (max-width: 400px) {
        .name-slot {
            width: 32px;
            height: 32px;
            font-size: 0.9em;
        }

        .character-icon-btn img {
            width: 32px;
            height: 37px;
        }

        .slot-character-icon {
            width: 32px;
            height: 37px;
        }
    }
</style>
