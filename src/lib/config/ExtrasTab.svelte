<script>
    import ImageButton from '../ImageButton.svelte';
    import { installState, swRegistration, currentPage } from '../../stores.js';

    export let opfsDisabled;
    export let openSection;
    export let toggleSection;
    export let handleExtensionChange;
    export let handleInstall;
    export let handleUninstall;

    $: progressAngle = ($installState.progress / 100) * 360;

    function navigateToSaveEditor(e) {
        e.preventDefault();
        history.pushState({ page: 'save-editor' }, '', '#save-editor');
        currentPage.set('save-editor');
    }
</script>

<div class="config-tab-panel active" id="config-tab-extras">
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('extensions')}>Extensions</button>
        <div class="config-card-content" class:open={openSection === 'extensions'}>
            <div class="toggle-group">
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-hd-textures" name="Texture Loader" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">HD Textures <span class="toggle-badge">+25MB</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Enhance the game's visuals with high-definition textures.</span></span>
                </div>
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-hd-music" name="HD Music" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">HD Music <span class="toggle-badge">+450MB</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Improve the game's music with high-definition audio.</span></span>
                </div>
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-widescreen-bgs" name="Widescreen Backgrounds" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">Widescreen Backgrounds <span class="toggle-badge">WIP</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Adapts the game's background art for modern widescreen monitors, eliminating unwanted 3D backgrounds on the sides of the screen.</span></span>
                </div>
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-outro" name="Outro FMV" data-not-ini="true" disabled={opfsDisabled}><span class="toggle-slider"></span><span class="toggle-label">Outro FMV</span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Plays the unused Outro animation upon exiting the game.</span></span>
                </div>
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-ending" name="Extended Bad Ending FMV" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">Extended Bad Ending FMV <span class="toggle-badge">+20MB</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Plays the extended / "uncut" Bad Ending animation as found in beta versions of the game upon failing to catch the Brickster.</span></span>
                </div>
            </div>
        </div>
    </div>
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('offline')}>Offline Play</button>
        <div class="config-card-content" class:open={openSection === 'offline'}>
            <div class="offline-play-grid">
                <div class="offline-play-text">
                    <p>Install the game for offline access. This will download all necessary files to your device (about 550MB).</p>
                    <p class="offline-note">Note: browsers enforce strict storage quotas, especially in private/incognito windows.</p>
                </div>
                <div class="offline-play-controls">
                    {#if !$swRegistration}
                        <p class="offline-error">Not available in development mode.</p>
                    {:else if $installState.installing}
                        <div class="progress-circular" style="background: radial-gradient(var(--color-bg-input) 60%, transparent 61%), conic-gradient(var(--color-primary) {progressAngle}deg, var(--color-border-dark) {progressAngle}deg);">
                            {Math.round($installState.progress)}%
                        </div>
                    {:else if $installState.installed}
                        <ImageButton
                            id="uninstall-btn"
                            offSrc="images/uninstall_off.webp"
                            onSrc="images/uninstall_on.webp"
                            alt="Uninstall Game"
                            onclick={handleUninstall}
                        />
                    {:else}
                        <ImageButton
                            id="install-btn"
                            offSrc="images/install_off.webp"
                            onSrc="images/install_on.webp"
                            alt="Install Game"
                            onclick={handleInstall}
                        />
                    {/if}
                </div>
            </div>
        </div>
    </div>
    <div class="config-section-card">
        <a href="#save-editor" class="config-card-header nav-link" onclick={navigateToSaveEditor}>Save Editor</a>
    </div>
</div>
