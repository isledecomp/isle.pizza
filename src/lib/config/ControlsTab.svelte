<script>
    export let opfsDisabled;
    export let openSection;
    export let toggleSection;
    export let isTouchDevice;
</script>

<div class="config-tab-panel active" id="config-tab-controls">
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('input')}>Input</button>
        <div class="config-card-content" class:open={openSection === 'input'}>
            <div class="form-grid">
                {#if isTouchDevice}
                    <div class="form-group" id="touch-section">
                        <label class="form-group-label" for="touch-type-select">
                            Touch Control Scheme
                            <span class="tooltip-trigger">?
                                <span class="tooltip-content">
                                    <div><strong>Virtual Gamepad (Recommended):</strong> Slide your finger to move and turn.</div><br>
                                    <div><strong>Virtual Arrow Keys:</strong> Tap screen areas to move. The top moves forward, the bottom turns or moves back.</div><br>
                                    <div><strong>Virtual Mouse:</strong> Emulates classic mouse controls with touch.</div>
                                </span>
                            </span>
                        </label>
                        <div class="select-wrapper">
                            <select id="touch-type-select" name="Touch Scheme" disabled={opfsDisabled}>
                                <option value="0">Virtual Mouse</option>
                                <option value="1">Virtual Arrow Keys</option>
                                <option value="2" selected>Virtual Gamepad</option>
                            </select>
                        </div>
                    </div>
                {/if}
                <div class="form-group">
                    <div class="toggle-group">
                        <div class="toggle-switch">
                            <label><input type="checkbox" id="check-haptic" name="Haptic" checked disabled={opfsDisabled}><span class="toggle-slider"></span><span class="toggle-label">Haptic feedback</span></label>
                            <span class="tooltip-trigger">?<span class="tooltip-content">On supported devices and browsers, this provides physical feedback, like a vibration, while you play the game.</span></span>
                        </div>
                        <div class="toggle-switch">
                            <label><input type="checkbox" id="check-wasd" name="WASD" disabled={opfsDisabled}><span class="toggle-slider"></span><span class="toggle-label">Use WASD for navigation</span></label>
                            <span class="tooltip-trigger">?<span class="tooltip-content">Use the WASD keys instead of the arrow keys to control the game, much akin to a modern PC game.</span></span>
                        </div>
                        <div class="toggle-switch">
                            <label><input type="checkbox" id="check-active-in-bg" name="Active in Background" disabled={opfsDisabled}><span class="toggle-slider"></span><span class="toggle-label">Active in background</span></label>
                            <span class="tooltip-trigger">?<span class="tooltip-content">Keeps the game running even when it's in the background.</span></span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
