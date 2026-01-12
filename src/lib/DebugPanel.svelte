<script>
    import { onDestroy } from 'svelte';
    import { debugUIVisible } from '../stores.js';

    let debugPanelOpen = false;
    let debugUIElement;
    let observer = null;

    // Set up MutationObserver when the element becomes available
    $: if (debugUIElement && !observer) {
        observer = new MutationObserver(() => {
            if (debugUIElement && debugUIElement.style.display === 'none') {
                debugUIElement.style.setProperty('display', 'block', 'important');
            }
        });
        observer.observe(debugUIElement, { attributes: true, attributeFilter: ['style'] });
    }

    // Clean up observer when component is destroyed
    onDestroy(() => {
        if (observer) {
            observer.disconnect();
            observer = null;
        }
    });

    let debugModeActive = false;
    let selectedLocation = '';
    let selectedAnimation = '';

    const keyCodeMap = {
        'Pause': { key: 'Pause', code: 'Pause', keyCode: 19 },
        'Escape': { key: 'Escape', code: 'Escape', keyCode: 27 },
        ' ': { key: ' ', code: 'Space', keyCode: 32 },
        'Tab': { key: 'Tab', code: 'Tab', keyCode: 9 },
        'F11': { key: 'F11', code: 'F11', keyCode: 122 },
        'F12': { key: 'F12', code: 'F12', keyCode: 123 },
        '+': { key: '+', code: 'NumpadAdd', keyCode: 107 },
        '-kp': { key: '-', code: 'NumpadSubtract', keyCode: 109 },
        '*': { key: '*', code: 'NumpadMultiply', keyCode: 106 },
        '/': { key: '/', code: 'NumpadDivide', keyCode: 111 },
        '0': { key: '0', code: 'Digit0', keyCode: 48 },
        '1': { key: '1', code: 'Digit1', keyCode: 49 },
        '2': { key: '2', code: 'Digit2', keyCode: 50 },
        '3': { key: '3', code: 'Digit3', keyCode: 51 },
        '4': { key: '4', code: 'Digit4', keyCode: 52 },
        '5': { key: '5', code: 'Digit5', keyCode: 53 },
        '6': { key: '6', code: 'Digit6', keyCode: 54 },
        '7': { key: '7', code: 'Digit7', keyCode: 55 },
        '8': { key: '8', code: 'Digit8', keyCode: 56 },
        '9': { key: '9', code: 'Digit9', keyCode: 57 },
    };

    const locations = [
        { value: 'c01', label: 'LCAMBA1 (01)' }, { value: 'c02', label: 'LCAMBA2 (02)' }, { value: 'c03', label: 'LCAMBA3 (03)' },
        { value: 'c04', label: 'LCAMBA4 (04)' }, { value: 'c05', label: 'LCAMCA1 (05)' }, { value: 'c06', label: 'LCAMCA2 (06)' },
        { value: 'c07', label: 'LCAMCA3 (07)' }, { value: 'c08', label: 'LCAMGS1 (08)' }, { value: 'c09', label: 'LCAMGS2 (09)' },
        { value: 'c10', label: 'LCAMGS3 (10)' }, { value: 'c11', label: 'LCAMHO1 (11)' }, { value: 'c12', label: 'LCAMHO2 (12)' },
        { value: 'c13', label: 'LCAMHO3 (13)' }, { value: 'c14', label: 'LCAMIS1 (14)' }, { value: 'c15', label: 'LCAMIS2 (15)' },
        { value: 'c16', label: 'LCAMIS3 (16)' }, { value: 'c17', label: 'LCAMIS4 (17)' }, { value: 'c18', label: 'LCAMIS5 (18)' },
        { value: 'c19', label: 'LCAMJA1 (19)' }, { value: 'c20', label: 'LCAMJA2 (20)' }, { value: 'c21', label: 'LCAMPO1 (21)' },
        { value: 'c22', label: 'LCAMPO2 (22)' }, { value: 'c23', label: 'LCAMPO3 (23)' }, { value: 'c24', label: 'LCAMPZ1 (24)' },
        { value: 'c25', label: 'LCAMPZ2 (25)' }, { value: 'c26', label: 'LCAMRA1 (26)' }, { value: 'c27', label: 'LCAMRA2 (27)' },
        { value: 'c28', label: 'LCAMRA3 (28)' }, { value: 'c29', label: 'LCAMRA4 (29)' }, { value: 'c30', label: 'LCAMRT1 (30)' },
        { value: 'c31', label: 'LCAMRT2 (31)' }, { value: 'c32', label: 'LCAMRT3 (32)' }, { value: 'c33', label: 'LCAMRT4 (33)' },
        { value: 'c34', label: 'LCAMRT5 (34)' }, { value: 'c35', label: 'LCAMRT6 (35)' }, { value: 'c36', label: 'LCAMRT7 (36)' },
        { value: 'c37', label: 'LCAMRT8 (37)' }, { value: 'c38', label: 'LCAMRT9 (38)' }, { value: 'c39', label: 'LCAMRT10 (39)' },
        { value: 'c40', label: 'LCAMRT11 (40)' }, { value: 'c41', label: 'LCAMRT12 (41)' }, { value: 'c42', label: 'LCAMRT13 (42)' },
        { value: 'c43', label: 'LCAMRT14 (43)' }, { value: 'c44', label: 'LCAMRT15 (44)' }, { value: 'c45', label: 'LCAMRT16 (45)' },
        { value: 'c46', label: 'LCAMRT17 (46)' }, { value: 'c47', label: 'LCAMRT18 (47)' }, { value: 'c48', label: 'LCAMRT19 (48)' },
        { value: 'c49', label: 'LCAMRT20 (49)' }, { value: 'c50', label: 'LCAMRT21 (50)' }, { value: 'c51', label: 'LCAMRT22 (51)' },
        { value: 'c52', label: 'LCAMRT23 (52)' }, { value: 'c53', label: 'LCAMRT24 (53)' }, { value: 'c54', label: 'LCAMRT25 (54)' },
        { value: 'c55', label: 'LCAMRT26 (55)' }, { value: 'c56', label: 'LCAMRT27 (56)' }, { value: 'c57', label: 'LCAMRT28 (57)' },
        { value: 'c58', label: 'LCAMRT29 (58)' }, { value: 'c59', label: 'LCAMRT30 (59)' }, { value: 'c60', label: 'LCAMRT31 (60)' },
        { value: 'c61', label: 'LCAMRT32 (61)' }, { value: 'c62', label: 'LCAMRT33 (62)' }, { value: 'c63', label: 'LCAMRT34 (63)' },
        { value: 'c64', label: 'LCAMRT35 (64)' }, { value: 'c65', label: 'LCAMRT36 (65)' }, { value: 'c66', label: 'LCAMRT37 (66)' },
        { value: 'c67', label: 'LCAMRT38 (67)' }, { value: 'c68', label: 'LCAMRT39 (68)' }, { value: 'c69', label: 'LCAMRT40 (69)' }
    ];

    // Sample animations (abbreviated for brevity - full list would be included in production)
    const animations = [
        { value: '400', label: 'wns050p1 (400)' }, { value: '500', label: 'sba001bu (500)' },
        { value: '600', label: 'ppz086bs (600)' }, { value: '700', label: 'hpz057ma (700)' },
        { value: '800', label: 'nca001ca (800)' }
    ];

    function sendKey(key) {
        const canvas = document.getElementById('canvas');
        let keyInfo = keyCodeMap[key];

        if (!keyInfo) {
            const char = key.toLowerCase();
            const charCode = char.charCodeAt(0);
            keyInfo = {
                key: char,
                code: 'Key' + char.toUpperCase(),
                keyCode: charCode >= 97 && charCode <= 122 ? charCode - 32 : charCode
            };
        }

        const eventInit = {
            key: keyInfo.key,
            code: keyInfo.code,
            keyCode: keyInfo.keyCode,
            which: keyInfo.keyCode,
            bubbles: true,
            cancelable: true
        };

        canvas.dispatchEvent(new KeyboardEvent('keydown', eventInit));
        canvas.dispatchEvent(new KeyboardEvent('keyup', eventInit));
    }

    function sendKeySequence(keys, delay = 100) {
        let index = 0;
        const canvas = document.getElementById('canvas');

        function sendNext() {
            if (index < keys.length) {
                sendKey(keys[index]);
                index++;
                setTimeout(sendNext, delay);
            } else {
                canvas.focus();
            }
        }
        sendNext();
    }

    function enterDebugMode() {
        sendKeySequence(['o', 'g', 'e', 'l']);
        debugModeActive = true;
    }

    function handleAction(keys, requiresDebug = false) {
        if (requiresDebug && !debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(keys.split('')), 500);
        } else if (keys.length > 1 && !keyCodeMap[keys]) {
            sendKeySequence(keys.split(''));
        } else {
            sendKey(keys);
            document.getElementById('canvas').focus();
        }
    }

    function gotoLocation() {
        if (!selectedLocation) return;
        if (!debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(selectedLocation.split('')), 500);
        } else {
            sendKeySequence(selectedLocation.split(''));
        }
    }

    function playAnimation() {
        if (!selectedAnimation) return;
        const paddedId = selectedAnimation.padStart(3, '0');
        const keys = ['v', ...paddedId.split('')];

        if (!debugModeActive) {
            enterDebugMode();
            setTimeout(() => sendKeySequence(keys), 500);
        } else {
            sendKeySequence(keys);
        }
    }
</script>

{#if $debugUIVisible}
    <div id="debug-ui" bind:this={debugUIElement}>
        <button id="debug-toggle" title="Debug Options" class:active={debugPanelOpen} onclick={() => debugPanelOpen = !debugPanelOpen}>⚙</button>

        {#if debugPanelOpen}
            <div id="debug-panel" class="open">
                <div class="debug-header">Debug Options</div>

                <div class="debug-section">
                    <div class="debug-section-title">General</div>
                    <button onclick={() => handleAction('Pause')}>Pause/Resume</button>
                    <button onclick={() => handleAction('Escape')}>Return to Infocenter</button>
                    <button onclick={() => handleAction(' ')}>Skip Animation</button>
                    <button onclick={() => handleAction('F12')}>Save Game</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Debug Mode (OGEL)</div>
                    <button class="debug-password" class:active={debugModeActive} onclick={enterDebugMode}>
                        {debugModeActive ? 'Debug Mode Active' : 'Enter Debug Mode'}
                    </button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('Tab', true)}>Toggle FPS</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('s', true)}>Toggle Music</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('p', true)}>Reset/Load Plants</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Camera/View</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('u', true)}>Move Up</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('d', true)}>Move Down</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">LOD (Level of Detail)</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('f', true)}>LOD 0.0 (Lowest)</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('x', true)}>LOD 3.6 (Default)</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('h', true)}>LOD 5.0 (Highest)</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Misc</div>
                    <button onclick={() => handleAction('z')}>Make Plants Dance</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Switch Act</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g2', true)}>Act 2</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g3', true)}>Act 3</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g4', true)}>Good Ending</button>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('g5', true)}>Bad Ending</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Locations</div>
                    <select bind:value={selectedLocation}>
                        <option value="">-- Select Location --</option>
                        {#each locations as loc}
                            <option value={loc.value}>{loc.label}</option>
                        {/each}
                    </select>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={gotoLocation}>Go to Location</button>
                </div>

                <div class="debug-section">
                    <div class="debug-section-title">Animations</div>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={() => handleAction('va', true)}>Play <b>all</b> cam animations</button>
                    <select bind:value={selectedAnimation}>
                        <option value="">-- Select Animation --</option>
                        {#each animations as anim}
                            <option value={anim.value}>{anim.label}</option>
                        {/each}
                    </select>
                    <button class="requires-debug" class:enabled={debugModeActive} onclick={playAnimation}>Play Animation</button>
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    /* Styles moved to app.css for #debug-ui */
</style>
