<script>
    import ImageButton from '../ImageButton.svelte';
    import { installState, swRegistration } from '../../stores.js';

    export let opfsDisabled;
    export let openSection;
    export let toggleSection;
    export let handleExtensionChange;
    export let handleInstall;
    export let handleUninstall;

    $: progressAngle = ($installState.progress / 100) * 360;
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
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-rabbits" name="Rabbits" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">Rabbits <span class="toggle-badge">+3MB</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Adds two rabbits that hop around on the mountain top, visiting and nibbling on plants.</span></span>
                </div>
                <div class="toggle-switch">
                    <label><input type="checkbox" id="check-third-person-camera" name="Third Person Camera" data-not-ini="true" disabled={opfsDisabled} onchange={handleExtensionChange}><span class="toggle-slider"></span><span class="toggle-label">Third-person Camera <span class="toggle-badge-experimental"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3L12 14L15 3"/><path d="M6 3H18"/><path d="M5 21H19L17 8H7L5 21Z"/></svg> Experimental</span></span></label>
                    <span class="tooltip-trigger">?<span class="tooltip-content">Switches to a third-person camera that follows your character around LEGO Island.</span></span>
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
</div>

<style>
.offline-note {
    font-size: 0.75em;
    color: #666;
    margin-top: 8px;
}

.offline-play-controls .offline-error {
    color: var(--color-primary);
    font-style: italic;
    font-size: 0.9em;
}

.offline-play-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    align-items: center;
}

.offline-play-text p {
    text-align: left;
    line-height: 1.5;
    font-size: 0.9em;
}

.offline-play-controls {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 150px;
}

.progress-circular {
    display: flex;
    position: relative;
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background:
        radial-gradient(var(--color-bg-input) 60%, transparent 61%),
        conic-gradient(var(--color-primary) 0deg, var(--color-border-dark) 0deg);
    align-items: center;
    justify-content: center;
    color: var(--color-text-light);
    font-size: 1.2em;
    font-weight: bold;
    font-family: 'Consolas', 'Menlo', monospace;
    transition: background 0.2s ease-out;
}

@media (max-width: 768px) {
    .offline-play-grid {
        grid-template-columns: 1fr;
        text-align: center;
    }

    .offline-play-text p {
        text-align: center;
    }
}
</style>
