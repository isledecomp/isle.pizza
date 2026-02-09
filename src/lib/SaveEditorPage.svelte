<script>
    import { onMount, onDestroy } from 'svelte';
    import BackButton from './BackButton.svelte';
    import Carousel from './Carousel.svelte';
    import MissionScoresEditor from './save-editor/MissionScoresEditor.svelte';
    import SkyColorEditor from './save-editor/SkyColorEditor.svelte';
    import LightPositionEditor from './save-editor/LightPositionEditor.svelte';
    import VehicleEditor from './save-editor/VehicleEditor.svelte';
    import ActorEditor from './save-editor/ActorEditor.svelte';
    import { fetchBitmapAsURL } from '../core/assetLoader.js';
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
        { id: 'scores', label: 'Scores', firstSection: null },
        { id: 'island', label: 'Island', firstSection: 'skycolor' },
        { id: 'vehicles', label: 'Vehicles', firstSection: null },
        { id: 'actors', label: 'Actors', firstSection: null }
    ];

    // Reset state when navigating to this page
    $: if ($currentPage === 'save-editor') {
        selectedSlot = null;
        activeTab = 'player';
        openSection = 'name';
    }

    // Name editing state (7 characters)
    let nameSlots = ['', '', '', '', '', '', ''];
    let slotRefs = [];

    // Character/Act state
    let currentAct = 0;
    let actorId = 1;

    // Character icons — loaded from SI file bitmaps
    const iconNames = ['pepper', 'mama', 'papa', 'nick', 'laura'];
    let characterIcons = {};
    let iconUrls = [];

    // Carousel state (bound from Carousel component)
    let carouselHasDragged = false;

    onMount(async () => {
        await loadSlots();

        // Load character icons from SI file in background
        const urls = await Promise.all(iconNames.flatMap(name => [
            fetchBitmapAsURL(name),
            fetchBitmapAsURL(`${name}-selected`)
        ]));
        iconUrls = urls;
        characterIcons = {
            [Actor.PEPPER]: { normal: urls[0], selected: urls[1] },
            [Actor.MAMA]: { normal: urls[2], selected: urls[3] },
            [Actor.PAPA]: { normal: urls[4], selected: urls[5] },
            [Actor.NICK]: { normal: urls[6], selected: urls[7] },
            [Actor.LAURA]: { normal: urls[8], selected: urls[9] }
        };
    });

    onDestroy(() => {
        for (const url of iconUrls) {
            if (url) URL.revokeObjectURL(url);
        }
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
        if (carouselHasDragged) return;
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

    async function handleVariableUpdate(update) {
        if (selectedSlot === null) return;

        try {
            const updated = await updateSaveSlot(selectedSlot, update);
            if (updated) {
                slots = slots.map(s =>
                    s.slotNumber === selectedSlot
                        ? { ...s, variables: updated.variables, act1State: updated.act1State, characters: updated.characters }
                        : s
                );
            }
        } catch (e) {
            console.error('Failed to update variable:', e);
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
        e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
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
            <img src="images/save.webp" alt="LEGO Island Save Editor">
        </div>
        <div class="config-main">
            {#if loading || error || existingSlots.length > 0}
                <Carousel bind:hasDragged={carouselHasDragged}>
                    {#if loading}
                        <span class="save-status-text">Loading save files...</span>
                    {:else if error}
                        <span class="save-status-text error">{error}</span>
                    {:else}
                        {#each existingSlots as slot}
                            <button
                                type="button"
                                class="save-slot-card"
                                class:selected={selectedSlot === slot.slotNumber}
                                onclick={() => handleSlotSelect(slot.slotNumber)}
                            >
                                {#if characterIcons[slot.header?.actorId]?.selected}
                                    <img
                                        src={characterIcons[slot.header?.actorId].selected}
                                        alt={ActorNames[slot.header?.actorId] || 'Character'}
                                        class="slot-character-icon"
                                        draggable="false"
                                    />
                                {/if}
                                <span class="slot-name">{slot.playerName}</span>
                            </button>
                        {/each}
                    {/if}
                </Carousel>
            {/if}

            {#if !loading && !error && existingSlots.length === 0}
                <div class="no-saves-state">
                    <img src="images/callfail.webp" alt="" class="no-saves-image" />
                    <span class="no-saves-title">No save files found</span>
                    <p class="no-saves-description">
                        Start playing LEGO Island and your save will appear here automatically.
                    </p>
                </div>
            {:else if !loading && !error && existingSlots.length > 0 && !currentSlot}
                <div class="no-saves-state">
                    <img src="images/register.webp" alt="" class="no-saves-image" />
                    <span class="no-saves-title">Select a save file above</span>
                    <p class="no-saves-description">
                        Choose a save slot to view and edit your player name, character, and high scores.
                    </p>
                </div>
            {/if}

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
                                                {#if characterIcons[actor.id]}
                                                    <img
                                                        src={actorId === actor.id
                                                            ? characterIcons[actor.id].selected
                                                            : characterIcons[actor.id].normal}
                                                        alt={actor.name}
                                                    />
                                                {/if}
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

                    <!-- Island Tab -->
                    <div class:hidden={activeTab !== 'island'}>
                        <div class="config-section-card">
                            <button type="button" class="config-card-header" onclick={() => toggleSection('skycolor')}>
                                Sky Color
                            </button>
                            <div class="config-card-content" class:open={openSection === 'skycolor'}>
                                <SkyColorEditor slot={currentSlot} onUpdate={handleVariableUpdate} />
                            </div>
                        </div>

                        <div class="config-section-card">
                            <button type="button" class="config-card-header" onclick={() => toggleSection('lightposition')}>
                                Light Position
                            </button>
                            <div class="config-card-content" class:open={openSection === 'lightposition'}>
                                <LightPositionEditor slot={currentSlot} onUpdate={handleVariableUpdate} />
                            </div>
                        </div>
                    </div>

                    <!-- Vehicles Tab -->
                    <div class:hidden={activeTab !== 'vehicles'}>
                        {#if $currentPage === 'save-editor'}
                            <VehicleEditor slot={currentSlot} onUpdate={handleVariableUpdate} />
                        {/if}
                    </div>

                    <!-- Actors Tab -->
                    <div class:hidden={activeTab !== 'actors'}>
                        {#if $currentPage === 'save-editor'}
                            <ActorEditor slot={currentSlot} onUpdate={handleVariableUpdate} />
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    :global(#save-editor > .page-inner-content > .config-main > .carousel) {
        margin-bottom: 15px;
    }

    .save-status-text {
        color: var(--color-text-muted);
        font-size: 0.9em;
        padding: 8px 0;
    }

    .save-status-text.error {
        color: #ff6b6b;
    }

    .no-saves-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 48px 24px;
        flex: 1;
    }

    .no-saves-image {
        width: 100px;
        height: auto;
        image-rendering: pixelated;
        margin-bottom: 16px;
        border-radius: 8px;
    }

    .no-saves-title {
        color: var(--color-text-light);
        font-size: 1.1em;
        font-weight: bold;
        margin-bottom: 8px;
    }

    .no-saves-description {
        color: var(--color-text-muted);
        font-size: 0.9em;
        line-height: 1.5;
        max-width: 280px;
        margin: 0;
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
        min-width: 0;
    }

    .name-slots {
        display: flex;
        gap: 4px;
        max-width: 100%;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
    }

    .name-slots::-webkit-scrollbar {
        display: none;
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
