(async function() {
    const debugUI = document.getElementById('debug-ui');
    const canvas = document.getElementById('canvas');

    // Fetch and inject debug panel HTML
    try {
        const response = await fetch('debug.html');
        const html = await response.text();
        debugUI.innerHTML = html;
    } catch (error) {
        console.error('Failed to load debug panel:', error);
        return;
    }

    // Now get references to elements after they've been injected
    const debugToggle = document.getElementById('debug-toggle');
    const debugPanel = document.getElementById('debug-panel');
    const debugPasswordBtn = document.querySelector('.debug-password');
    const requiresDebugBtns = document.querySelectorAll('.requires-debug');

    let debugModeActive = false;

    // Key code mapping for special keys
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
        // Digit keys
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

    // Toggle debug panel
    debugToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        debugPanel.classList.toggle('open');
        debugToggle.classList.toggle('active');
    });

    // Dispatch a keyboard event to the canvas
    function sendKey(key) {
        let keyInfo = keyCodeMap[key];

        if (!keyInfo) {
            // Regular character key (letters)
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

    // Send a sequence of keys with delay (longer delay for multi-stage commands)
    function sendKeySequence(keys, delay = 100) {
        let index = 0;
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

    // Update button states based on debug mode
    function updateDebugModeUI() {
        if (debugModeActive) {
            debugPasswordBtn.classList.add('active');
            debugPasswordBtn.textContent = 'Debug Mode Active';
            requiresDebugBtns.forEach(btn => btn.classList.add('enabled'));
        } else {
            debugPasswordBtn.classList.remove('active');
            debugPasswordBtn.textContent = 'Enter Debug Mode';
            requiresDebugBtns.forEach(btn => btn.classList.remove('enabled'));
        }
    }

    // Handle button clicks
    debugPanel.addEventListener('click', function(e) {
        const btn = e.target.closest('button');
        if (!btn || btn === debugToggle) return;

        const keys = btn.dataset.keys;
        if (!keys) return;

        e.preventDefault();
        e.stopPropagation();

        // Handle special cases
        if (keys === 'ogel') {
            // Enter debug password
            sendKeySequence(['o', 'g', 'e', 'l']);
            debugModeActive = true;
            updateDebugModeUI();
            return;
        }

        // For requires-debug buttons, ensure debug mode is active
        if (btn.classList.contains('requires-debug') && !debugModeActive) {
            // Auto-enter debug mode first
            sendKeySequence(['o', 'g', 'e', 'l']);
            debugModeActive = true;
            updateDebugModeUI();
            // Then send the actual keys after a delay
            setTimeout(() => {
                sendKeySequence(keys.split(''));
            }, 500);
            return;
        }

        // Handle multi-key sequences (like 'g1' for act switch or 'c00' for locations)
        if (keys.length > 1 && !keyCodeMap[keys]) {
            sendKeySequence(keys.split(''));
        } else {
            sendKey(keys);
            canvas.focus();
        }
    });

    // Handle location teleport
    const locationSelect = document.getElementById('debug-location-select');
    const gotoLocationBtn = document.getElementById('debug-goto-location');

    gotoLocationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const locationValue = locationSelect.value;
        if (!locationValue) return;

        // Ensure debug mode is active
        if (!debugModeActive) {
            sendKeySequence(['o', 'g', 'e', 'l']);
            debugModeActive = true;
            updateDebugModeUI();
            // Then send location keys after a delay
            setTimeout(() => {
                sendKeySequence(locationValue.split(''));
            }, 500);
            return;
        }

        sendKeySequence(locationValue.split(''));
    });

    // Handle animation playback
    const animationSelect = document.getElementById('debug-animation-select');
    const playAnimationBtn = document.getElementById('debug-play-animation');

    playAnimationBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const animationId = animationSelect.value;
        if (!animationId) return;

        // Ensure debug mode is active
        if (!debugModeActive) {
            sendKeySequence(['o', 'g', 'e', 'l']);
            debugModeActive = true;
            updateDebugModeUI();
            // Then send animation keys after a delay
            setTimeout(() => {
                playAnimation(animationId);
            }, 500);
            return;
        }

        playAnimation(animationId);
    });

    function playAnimation(animationId) {
        // Animation command: 'v' + 3 digits (padded with leading zeros)
        const paddedId = animationId.toString().padStart(3, '0');
        const keys = ['v', ...paddedId.split('')];
        sendKeySequence(keys);
    }

    // Initialize UI
    updateDebugModeUI();
})();
