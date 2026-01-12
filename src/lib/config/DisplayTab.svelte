<script>
    export let opfsDisabled;
    export let openSection;
    export let toggleSection;
    export let fullscreenSupported;
    export let msaaSupported;
    export let afSupported;
    export let showOrHideGraphicsOptions;
    export let checkCacheStatus;
</script>

<div class="config-tab-panel active" id="config-tab-display">
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('game')}>Game</button>
        <div class="config-card-content" class:open={openSection === 'game'}>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-group-label" for="language-select">Version</label>
                    <div class="select-wrapper">
                        <select id="language-select" name="Language" disabled={opfsDisabled} onchange={() => checkCacheStatus()}>
                            <option value="da">Danish</option>
                            <option value="el">English (1.0)</option>
                            <option value="en" selected>English (1.1)</option>
                            <option value="fr">French</option>
                            <option value="de">German</option>
                            <option value="it">Italian</option>
                            <option value="jp">Japanese</option>
                            <option value="ko">Korean</option>
                            <option value="pt">Portuguese</option>
                            <option value="ru">Russian</option>
                            <option value="es">Spanish</option>
                        </select>
                    </div>
                </div>
                {#if fullscreenSupported}
                    <div class="form-group" id="window-form">
                        <span class="form-group-label">Window</span>
                        <div class="radio-group option-list">
                            <div class="option-item">
                                <input type="radio" id="window-windowed" name="window" data-not-ini="true" checked disabled={opfsDisabled}>
                                <label for="window-windowed">Windowed</label>
                            </div>
                            <div class="option-item">
                                <input type="radio" id="window-fullscreen" name="window" data-not-ini="true" disabled={opfsDisabled}>
                                <label for="window-fullscreen">Full Screen</label>
                            </div>
                        </div>
                    </div>
                {/if}
                <div class="form-group">
                    <span class="form-group-label">
                        Aspect Ratio
                        <span class="tooltip-trigger">?
                            <span class="tooltip-content">Choose Original (4:3) to preserve the classic aspect ratio with black bars, or select Widescreen to stretch the image to fit your display.</span>
                        </span>
                    </span>
                    <div class="radio-group option-list">
                        <div class="option-item">
                            <input type="radio" id="aspect-original" value="1" name="Original Aspect Ratio" checked disabled={opfsDisabled}>
                            <label for="aspect-original">Original (4:3)</label>
                        </div>
                        <div class="option-item">
                            <input type="radio" id="aspect-wide" value="0" name="Original Aspect Ratio" disabled={opfsDisabled}>
                            <label for="aspect-wide">Widescreen</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <span class="form-group-label">
                        Resolution
                        <span class="tooltip-trigger">?
                            <span class="tooltip-content">Choose Original (640 x 480) to preserve the classic resolution, or select Maximum to render in the highest quality.</span>
                        </span>
                    </span>
                    <div class="radio-group option-list">
                        <div class="option-item">
                            <input type="radio" id="resolution-original" value="1" name="Original Resolution" checked disabled={opfsDisabled}>
                            <label for="resolution-original">Original (640 x 480)</label>
                        </div>
                        <div class="option-item">
                            <input type="radio" id="resolution-wide" value="0" name="Original Resolution" disabled={opfsDisabled}>
                            <label for="resolution-wide">Maximum</label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('detail')}>Detail</button>
        <div class="config-card-content" class:open={openSection === 'detail'}>
            <div class="form-grid">
                <div class="form-group">
                    <span class="form-group-label">
                        Island Model Quality
                        <span class="tooltip-trigger">?
                            <span class="tooltip-content">Note: using the "Low" setting will cause the island to disappear. This is not a bug, but the same behavior as present in the original game.</span>
                        </span>
                    </span>
                    <div class="radio-group option-list">
                        <div class="option-item">
                            <input type="radio" id="gfx-low" name="Island Quality" value="0" disabled={opfsDisabled}>
                            <label for="gfx-low">Low</label>
                        </div>
                        <div class="option-item">
                            <input type="radio" id="gfx-med" name="Island Quality" value="1" disabled={opfsDisabled}>
                            <label for="gfx-med">Medium</label>
                        </div>
                        <div class="option-item">
                            <input type="radio" id="gfx-high" name="Island Quality" value="2" checked disabled={opfsDisabled}>
                            <label for="gfx-high">High</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <span class="form-group-label">Island Texture Quality</span>
                    <div class="radio-group option-list">
                        <div class="option-item">
                            <input type="radio" id="tex-low" name="Island Texture" value="0" disabled={opfsDisabled}>
                            <label for="tex-low">Low</label>
                        </div>
                        <div class="option-item">
                            <input type="radio" id="tex-high" name="Island Texture" value="1" checked disabled={opfsDisabled}>
                            <label for="tex-high">High</label>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-group-label" for="max-lod">
                        Maximum LOD
                        <span class="tooltip-trigger">?
                            <span class="tooltip-content">Maximum Level of Detail (LOD). A higher setting will cause higher quality textures to be drawn regardless of distance.</span>
                        </span>
                    </label>
                    <input type="range" id="max-lod" name="Max LOD" min="0" max="6" step="0.1" value="3.6" disabled={opfsDisabled}>
                </div>
                <div class="form-group">
                    <label class="form-group-label" for="max-allowed-extras">
                        Maximum actors (5..40)
                        <span class="tooltip-trigger">?
                            <span class="tooltip-content">Maximum number of LEGO actors to exist in the world at a time. The game will gradually increase the number of actors until this maximum is reached and while performance is acceptable.</span>
                        </span>
                    </label>
                    <input type="range" id="max-allowed-extras" name="Max Allowed Extras" min="5" max="40" value="20" disabled={opfsDisabled}>
                </div>
            </div>
        </div>
    </div>
    <div class="config-section-card">
        <button type="button" class="config-card-header" onclick={() => toggleSection('graphics')}>Graphics</button>
        <div class="config-card-content" class:open={openSection === 'graphics'}>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-group-label" for="renderer-select">Renderer</label>
                    <div class="select-wrapper">
                        <select id="renderer-select" name="3D Device ID" disabled={opfsDisabled} onchange={showOrHideGraphicsOptions}>
                            <option value="0 0x682656f3 0x0 0x0 0x2000000">Software</option>
                            <option value="0 0x682656f3 0x0 0x0 0x4000000" selected>WebGL</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-group-label" for="transition-type-select">Transition Type</label>
                    <div class="select-wrapper">
                        <select id="transition-type-select" name="Transition Type" disabled={opfsDisabled}>
                            <option value="1">No Animation</option>
                            <option value="2">Dissolve</option>
                            <option value="3" selected>Mosaic</option>
                            <option value="4">Wipe Down</option>
                            <option value="5">Windows</option>
                        </select>
                    </div>
                </div>
                {#if msaaSupported}
                    <div class="form-group">
                        <label class="form-group-label" for="msaa-select">Anti-aliasing</label>
                        <div class="select-wrapper">
                            <select id="msaa-select" name="MSAA" disabled={opfsDisabled}></select>
                        </div>
                    </div>
                {/if}
                {#if afSupported}
                    <div class="form-group">
                        <label class="form-group-label" for="anisotropic-select">Anisotropic filtering</label>
                        <div class="select-wrapper">
                            <select id="anisotropic-select" name="Anisotropic" disabled={opfsDisabled}></select>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
