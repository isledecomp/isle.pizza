<script>
    import { onMount, tick } from 'svelte';

    import BackButton from './BackButton.svelte';
    import OpfsDisabledBanner from './OpfsDisabledBanner.svelte';
    import DisplayTab from './config/DisplayTab.svelte';
    import ControlsTab from './config/ControlsTab.svelte';
    import AudioTab from './config/AudioTab.svelte';
    import ExtrasTab from './config/ExtrasTab.svelte';
    import { installState, currentPage, opfsDisabled, configVersion } from '../stores.js';
    import { loadConfig, saveConfig, getFileHandle } from '../core/opfs.js';
    import { checkCacheStatus, startInstall, startUninstall, getSiFilesForCache } from '../core/service-worker.js';
    import { getMsaaSamples, getMaxAnisotropy, populateMsaaSelect, populateAfSelect } from '../core/webgl.js';

    let activeTab = 'display';
    let openSection = 'game';

    // Reset to default tab/section when navigating to this page
    $: if ($currentPage === 'configure') {
        activeTab = 'display';
        openSection = 'game';
    }

    // Reload config from OPFS when navigating to this page
    $: if ($currentPage === 'configure' && configForm && !$opfsDisabled) {
        loadConfig(configForm);
    }

    // Reload config from OPFS after cloud sync (even if not on config page),
    // so that saveConfigFromDOM() before game launch won't overwrite it with stale form values
    $: if ($configVersion && configForm && !$opfsDisabled) {
        loadConfig(configForm);
    }

    let configForm;
    let msaaSupported = false;
    let afSupported = false;
    let isTouchDevice = false;
    let fullscreenSupported = false;

    const configTabs = [
        { id: 'display', label: 'Display', firstSection: 'game' },
        { id: 'controls', label: 'Controls', firstSection: 'input' },
        { id: 'audio', label: 'Audio', firstSection: 'sound' },
        { id: 'extras', label: 'Extras', firstSection: 'extensions' }
    ];

    onMount(async () => {
        isTouchDevice = window.matchMedia('(any-pointer: coarse)').matches;
        fullscreenSupported = !!document.documentElement.requestFullscreen;

        // Initialize WebGL options
        const samples = getMsaaSamples();
        const maxAniso = getMaxAnisotropy();

        if (samples) msaaSupported = true;
        if (maxAniso) afSupported = true;

        // Wait for DOM to update after setting flags
        await tick();

        if (samples) {
            const msaaSelect = document.getElementById('msaa-select');
            populateMsaaSelect(msaaSelect, samples);
        }

        if (maxAniso) {
            const afSelect = document.getElementById('anisotropic-select');
            populateAfSelect(afSelect, maxAniso);
        }

        // Load config from OPFS
        const handle = await getFileHandle();
        if (!handle) {
            opfsDisabled.set(true);
        } else {
            try {
                const config = await loadConfig(configForm);
                if (!config) {
                    // Save defaults silently (no toast on initial creation)
                    await saveConfig(configForm, getSiFiles, true);
                }
            } catch (e) {
                // Read error — do NOT overwrite config with defaults
                console.error('Config read failed, keeping existing data:', e);
            }
            showOrHideGraphicsOptions();
        }

        // Check cache status
        checkCacheStatus();

        // Setup fullscreen handlers
        if (fullscreenSupported) {
            const fullscreenEl = document.getElementById('window-fullscreen');
            const windowedEl = document.getElementById('window-windowed');

            fullscreenEl?.addEventListener('change', () => {
                if (fullscreenEl.checked) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                }
            });

            windowedEl?.addEventListener('change', () => {
                if (windowedEl.checked && document.fullscreenElement) {
                    document.exitFullscreen();
                }
            });

            document.addEventListener('fullscreenchange', () => {
                if (document.fullscreenElement) {
                    fullscreenEl.checked = true;
                } else {
                    windowedEl.checked = true;
                }
            });
        }
    });

    function getSiFiles() {
        const hdMusic = document.getElementById('check-hd-music');
        const widescreenBgs = document.getElementById('check-widescreen-bgs');
        const badEnding = document.getElementById('check-ending');
        const rabbits = document.getElementById('check-rabbits');
        return getSiFilesForCache(hdMusic, widescreenBgs, badEnding, rabbits);
    }

    function handleFormChange() {
        if (!$opfsDisabled) {
            saveConfig(configForm, getSiFiles);
        }
        showOrHideGraphicsOptions();
    }

    function showOrHideGraphicsOptions() {
        const rendererSelect = document.getElementById('renderer-select');
        const msaaGroup = document.getElementById('msaa-select')?.closest('.form-group');
        const afGroup = document.getElementById('anisotropic-select')?.closest('.form-group');

        if (rendererSelect?.value === "0 0x682656f3 0x0 0x0 0x2000000") {
            if (msaaGroup) msaaGroup.style.display = 'none';
            if (afGroup) afGroup.style.display = 'none';
        } else {
            if (msaaGroup && msaaSupported) msaaGroup.style.display = '';
            if (afGroup && afSupported) afGroup.style.display = '';
        }
    }

    function applyPreset(preset) {
        if (preset === 'classic') {
            document.getElementById('language-select').value = 'en';
            const windowed = document.getElementById('window-windowed');
            if (windowed) windowed.checked = true;
            document.getElementById('aspect-original').checked = true;
            document.getElementById('resolution-original').checked = true;
            document.getElementById('gfx-high').checked = true;
            document.getElementById('tex-high').checked = true;
            document.getElementById('max-lod').value = '3.6';
            document.getElementById('max-allowed-extras').value = '20';
            document.querySelectorAll('#config-tab-extras .toggle-group input[type="checkbox"]').forEach(cb => cb.checked = false);
        } else if (preset === 'modern') {
            document.getElementById('aspect-wide').checked = true;
            document.getElementById('resolution-wide').checked = true;
            document.getElementById('gfx-high').checked = true;
            document.getElementById('tex-high').checked = true;
            document.getElementById('max-lod').value = '6';
            document.getElementById('max-allowed-extras').value = '40';
            document.getElementById('check-hd-textures').checked = true;
            document.getElementById('check-hd-music').checked = true;
            document.getElementById('check-widescreen-bgs').checked = true;
        }
        handleFormChange();
        checkCacheStatus();
    }

    function toggleSection(sectionId) {
        openSection = openSection === sectionId ? null : sectionId;
    }

    function switchTab(tab) {
        activeTab = tab.id;
        openSection = tab.firstSection;
    }

    function handleInstall() {
        const languageSelect = document.getElementById('language-select');
        startInstall($installState.missingFiles, languageSelect.value);
    }

    function handleUninstall() {
        const languageSelect = document.getElementById('language-select');
        startUninstall(languageSelect.value);
    }

    function handleExtensionChange() {
        checkCacheStatus();
    }
</script>

<div id="configure-page" class="page-content">
    <BackButton />
    <OpfsDisabledBanner />
    <div class="page-inner-content config-layout">
        <div class="config-art-panel">
            <img src="images/shark.webp" alt="LEGO Island Shark and Brickster">
        </div>
        <div class="config-main">
            <div class="config-presets">
                <button type="button" class="preset-btn" disabled={$opfsDisabled} onclick={() => applyPreset('classic')}>Classic Mode</button>
                <button type="button" class="preset-btn" disabled={$opfsDisabled} onclick={() => applyPreset('modern')}>Modern Mode</button>
            </div>
            <div class="config-tabs">
                <div class="config-tab-buttons">
                    {#each configTabs as tab}
                        <button class="config-tab-btn" class:active={activeTab === tab.id} onclick={() => switchTab(tab)}>
                            {tab.label}
                        </button>
                    {/each}
                </div>
                <form id="config-form" class="config-form" bind:this={configForm} onchange={handleFormChange}>
                    <div class:hidden={activeTab !== 'display'}>
                        <DisplayTab
                            opfsDisabled={$opfsDisabled}
                            {openSection}
                            {toggleSection}
                            {fullscreenSupported}
                            {msaaSupported}
                            {afSupported}
                            {showOrHideGraphicsOptions}
                            {checkCacheStatus}
                        />
                    </div>
                    <div class:hidden={activeTab !== 'controls'}>
                        <ControlsTab
                            opfsDisabled={$opfsDisabled}
                            {openSection}
                            {toggleSection}
                            {isTouchDevice}
                        />
                    </div>
                    <div class:hidden={activeTab !== 'audio'}>
                        <AudioTab
                            opfsDisabled={$opfsDisabled}
                            {openSection}
                            {toggleSection}
                        />
                    </div>
                    <div class:hidden={activeTab !== 'extras'}>
                        <ExtrasTab
                            opfsDisabled={$opfsDisabled}
                            {openSection}
                            {toggleSection}
                            {handleExtensionChange}
                            {handleInstall}
                            {handleUninstall}
                        />
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>
