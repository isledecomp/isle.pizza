<script>
    export let opfsDisabled;
    export let openSection;
    export let toggleSection;
</script>

<div class="config-tab-panel active" id="config-tab-audio">
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('sound')}>Sound</button>
        <div class="config-card-content" class:open={openSection === 'sound'}>
            <div class="toggle-group">
                <label class="toggle-switch">
                    <input type="checkbox" id="check-music" name="Music" checked disabled={opfsDisabled}>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">Music</span>
                </label>
                <label class="toggle-switch">
                    <input type="checkbox" id="check-3d-sound" name="3DSound" checked disabled={opfsDisabled}>
                    <span class="toggle-slider"></span>
                    <span class="toggle-label">3D Sound</span>
                </label>
            </div>
        </div>
    </div>
</div>
