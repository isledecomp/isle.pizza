var Module = {
    arguments: ['--ini', '/config/isle.ini'],
    running: false,
    preRun: function () {
        Module["addRunDependency"]("isle");
        Module.running = true;
    },
    canvas: (function () {
        return document.getElementById('canvas');
    })(),
    onExit: function () {
        window.location.reload();
    }
};

document.addEventListener('DOMContentLoaded', function () {
    // --- Elements ---
    const audio = document.getElementById('install-audio');
    const soundToggleEmoji = document.getElementById('sound-toggle-emoji');
    const mainContainer = document.getElementById('main-container');
    const topContent = document.getElementById('top-content');
    const controlsWrapper = document.getElementById('controls-wrapper');
    const allPages = document.querySelectorAll('.page-content');
    const pageButtons = document.querySelectorAll('[data-target]');
    const backButtons = document.querySelectorAll('.page-back-button');
    const languageSelect = document.getElementById('language-select');
    const installBtn = document.getElementById('install-btn');
    const uninstallBtn = document.getElementById('uninstall-btn');
    const controlsContainer = document.querySelector('.offline-play-controls');
    const msaaSelect = document.querySelector('select[name="MSAA"]');
    const msaaGroup = msaaSelect.closest('.form-group');
    const afSelect = document.querySelector('select[name="Anisotropic"]');
    const afGroup = afSelect.closest('.form-group');
    const rendererSelect = document.getElementById('renderer-select');
    const hdTextures = document.getElementById('check-hd-textures');
    const hdMusic = document.getElementById('check-hd-music');
    const widescreenBgs = document.getElementById('check-widescreen-bgs');
    const outroFmv = document.getElementById('check-outro');
    const badEnding = document.getElementById('check-ending');
    const logo = document.getElementById('island-logo-img');

    // --- Debug Mode Activation (5 taps on logo) ---
    let debugTapCount = 0;
    let debugTapTimeout = null;
    let debugEnabled = false;

    // Pizza celebration animation for OGEL mode
    function celebratePizza(originElement) {
        const rect = originElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const sliceCount = 12;

        for (let i = 0; i < sliceCount; i++) {
            const slice = document.createElement('div');
            slice.className = 'pizza-slice';
            slice.textContent = '🍕';

            // Calculate direction for this slice
            const angle = (i / sliceCount) * Math.PI * 2;
            const distance = 150 + Math.random() * 100;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            const rotation = (Math.random() - 0.5) * 720;

            slice.style.left = centerX + 'px';
            slice.style.top = centerY + 'px';
            slice.style.setProperty('--tx', tx + 'px');
            slice.style.setProperty('--ty', ty + 'px');
            slice.style.setProperty('--rot', rotation + 'deg');
            slice.style.animationDelay = (Math.random() * 0.2) + 's';

            document.body.appendChild(slice);

            // Remove after animation completes
            setTimeout(function() {
                slice.remove();
            }, 1700);
        }
    }

    logo.addEventListener('click', function() {
        if (debugEnabled) {
            // Replay pizza animation on subsequent clicks
            celebratePizza(logo);
            return;
        }

        debugTapCount++;
        clearTimeout(debugTapTimeout);

        if (debugTapCount >= 5) {
            // Enable debug mode
            debugEnabled = true;
            logo.src = 'ogel.webp';
            logo.alt = 'OGEL Mode Enabled';

            // Celebrate with pizza!
            celebratePizza(logo);

            // Dynamically load debug.js
            const script = document.createElement('script');
            script.src = 'debug.js';
            document.body.appendChild(script);
        } else {
            // Reset tap count after 1 second of no taps
            debugTapTimeout = setTimeout(function() {
                debugTapCount = 0;
            }, 1000);
        }
    });

    // --- Sound Toggle ---
    function updateSoundEmojiState() {
        soundToggleEmoji.textContent = audio.paused ? '🔇' : '🔊';
        soundToggleEmoji.title = audio.paused ? 'Play Audio' : 'Pause Audio';
    }

    if (audio && soundToggleEmoji) {
        updateSoundEmojiState();
        soundToggleEmoji.addEventListener('click', function () {
            if (audio.paused) {
                audio.currentTime = 0;
                audio.play();
            } else {
                audio.pause();
            }
        });
        audio.addEventListener('play', updateSoundEmojiState);
        audio.addEventListener('pause', updateSoundEmojiState);
    }

    // --- Control Image Hover ---
    const imageControls = document.querySelectorAll('.control-img');
    imageControls.forEach(control => {
        const hoverImage = new Image();
        if (control.dataset.on) {
            hoverImage.src = control.dataset.on;
        }
        control.addEventListener('mouseover', function () { if (this.dataset.on) { this.src = this.dataset.on; } });
        control.addEventListener('mouseout', function () { if (this.dataset.off) { this.src = this.dataset.off; } });
    });

    // --- Emscripten Launch Logic ---
    const runGameButton = document.getElementById('run-game-btn');
    const emscriptenCanvas = document.getElementById('canvas');
    const canvasWrapper = document.getElementById('canvas-wrapper');
    const loadingGifOverlay = document.getElementById('loading-gif-overlay');
    const statusMessageBar = document.getElementById('emscripten-status-message');

    runGameButton.addEventListener('click', function () {
        if (!Module.running) return;
        audio.pause();
        updateSoundEmojiState();
        this.src = this.dataset.on;

        mainContainer.style.display = 'none';
        canvasWrapper.style.display = 'grid';

        document.documentElement.style.overflow = 'hidden';
        document.documentElement.style.overscrollBehavior = 'none';

        Module["disableOffscreenCanvases"] ||= rendererSelect.value == "0 0x682656f3 0x0 0x0 0x2000000";
        console.log("disableOffscreenCanvases: " + Module["disableOffscreenCanvases"]);

        Module["removeRunDependency"]("isle");
        emscriptenCanvas.focus();
    });

    let progressUpdates = 0;
    const debugUI = document.getElementById('debug-ui');
    let debugUIVisible = false;

    // MutationObserver to prevent Emscripten from hiding the debug UI
    const debugUIObserver = new MutationObserver(function(mutations) {
        if (debugUIVisible && debugUI.style.display === 'none') {
            debugUI.style.setProperty('display', 'block', 'important');
        }
    });
    debugUIObserver.observe(debugUI, { attributes: true, attributeFilter: ['style'] });

    emscriptenCanvas.addEventListener('presenterProgress', function (event) {
        // Intro animation is ready
        if (event.detail.objectName == 'Lego_Smk' && event.detail.tickleState == 1) {
            loadingGifOverlay.style.display = 'none';
            emscriptenCanvas.style.setProperty('display', 'block', 'important');
            debugUIVisible = true;
            debugUI.style.setProperty('display', 'block', 'important');
        }
        else if (progressUpdates < 1003) {
            progressUpdates++;
            const percent = (progressUpdates / 1003 * 100).toFixed();
            statusMessageBar.innerHTML = 'Loading LEGO® Island... please wait! <code>' + percent + '%</code>';
        }
    });

    emscriptenCanvas.addEventListener('extensionProgress', function (event) {
        statusMessageBar.innerHTML = 'Loading ' + event.detail.name + '... please wait! <code>' + event.detail.progress + '%</code>';
    });

    // --- Page Navigation Logic ---
    function showPage(pageId, pushState = true) {
        const page = document.querySelector(pageId);
        if (!page) return;

        // Hide main content
        topContent.style.display = 'none';
        controlsWrapper.style.display = 'none';

        // Show selected page
        page.style.display = 'flex';
        window.scroll(0, 0);

        // Reset Read Me tabs to About when entering
        if (pageId === '#read-me-page') {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === 'about');
            });
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.toggle('active', panel.id === 'tab-about');
            });
        }

        if (pushState) {
            const newPath = pageId.replace('-page', '');
            history.pushState({ page: pageId }, '', newPath);
        }
    }

    function showMainMenu() {
        // Hide all pages
        allPages.forEach(p => p.style.display = 'none');

        // Show main content
        topContent.style.display = 'flex';
        controlsWrapper.style.display = 'flex';
    }

    pageButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const targetId = e.currentTarget.dataset.target;
            showPage(targetId);
        });
    });

    backButtons.forEach(button => {
        button.addEventListener('click', () => {
            history.back();
        });
    });

    // --- Read Me Tabs ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Update button states
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Update panel visibility
            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === 'tab-' + targetTab) {
                    panel.classList.add('active');
                }
            });
        });
    });

    // --- Configure Tabs ---
    const configTabButtons = document.querySelectorAll('.config-tab-btn');
    const configTabPanels = document.querySelectorAll('.config-tab-panel');

    configTabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.configTab;
            configTabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            configTabPanels.forEach(panel => {
                panel.classList.remove('active');
                if (panel.id === 'config-tab-' + targetTab) {
                    panel.classList.add('active');
                    // Open first section, close others
                    const sections = panel.querySelectorAll('.config-section-card');
                    sections.forEach((section, index) => {
                        section.open = (index === 0);
                    });
                }
            });
        });
    });

    // --- Accordion behavior for config sections ---
    // Note: We prevent default and manually toggle to avoid Safari's scroll jump bug
    const configSections = document.querySelectorAll('.config-section-card');
    configSections.forEach(section => {
        const summary = section.querySelector('summary');
        if (summary) {
            summary.addEventListener('click', (e) => {
                e.preventDefault();

                if (section.open) {
                    // Closing this section
                    section.open = false;
                } else {
                    // Opening this section - close others first
                    configSections.forEach(other => {
                        if (other !== section && other.open) {
                            other.open = false;
                        }
                    });
                    section.open = true;
                }
            });
        }
    });

    // --- Tooltip handling for touch devices only ---
    const isTouchDevice = window.matchMedia('(pointer: coarse)').matches;
    if (isTouchDevice) {
        const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
        tooltipTriggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const wasActive = trigger.classList.contains('active');

                // Close all other tooltips
                tooltipTriggers.forEach(other => {
                    other.classList.remove('active');
                });

                // Toggle this tooltip
                if (!wasActive) {
                    trigger.classList.add('active');
                }
            });
        });

        // Close tooltips when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tooltip-trigger')) {
                tooltipTriggers.forEach(trigger => {
                    trigger.classList.remove('active');
                });
            }
        });
    }

    // --- Preset Buttons ---
    const presetClassic = document.getElementById('preset-classic');
    const presetModern = document.getElementById('preset-modern');

    function applyPreset(preset) {
        if (preset === 'classic') {
            // Game section defaults
            document.getElementById('language-select').value = 'en';
            document.getElementById('window-windowed').checked = true;
            document.getElementById('aspect-original').checked = true;
            document.getElementById('resolution-original').checked = true;
            // Detail section defaults
            document.getElementById('gfx-high').checked = true;
            document.getElementById('tex-high').checked = true;
            document.getElementById('max-lod').value = '3.6';
            document.getElementById('max-allowed-extras').value = '20';
            // Disable all extensions
            document.getElementById('check-hd-textures').checked = false;
            document.getElementById('check-hd-music').checked = false;
            document.getElementById('check-widescreen-bgs').checked = false;
            document.getElementById('check-outro').checked = false;
            document.getElementById('check-ending').checked = false;
        } else if (preset === 'modern') {
            document.getElementById('aspect-wide').checked = true;
            document.getElementById('resolution-wide').checked = true;
            document.getElementById('gfx-high').checked = true;
            document.getElementById('tex-high').checked = true;
            document.getElementById('max-lod').value = '6';
            document.getElementById('max-allowed-extras').value = '40';
            // Enable HD extensions
            document.getElementById('check-hd-textures').checked = true;
            document.getElementById('check-hd-music').checked = true;
            document.getElementById('check-widescreen-bgs').checked = true;
        }
        // Trigger change event to save config
        const configForm = document.getElementById('config-form');
        if (configForm) {
            configForm.dispatchEvent(new Event('change'));
        }
        // Refresh Offline Play button state
        if (typeof checkInitialCacheStatus === 'function') {
            checkInitialCacheStatus();
        }
    }

    if (presetClassic) {
        presetClassic.addEventListener('click', () => applyPreset('classic'));
    }
    if (presetModern) {
        presetModern.addEventListener('click', () => applyPreset('modern'));
    }

    // --- Config Toast ---
    const configToast = document.getElementById('config-toast');
    let toastTimeout = null;

    function showConfigToast() {
        if (configToast) {
            configToast.classList.add('show');
            if (toastTimeout) clearTimeout(toastTimeout);
            toastTimeout = setTimeout(() => {
                configToast.classList.remove('show');
            }, 2000);
        }
    }

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.page && e.state.page !== 'main') {
            showPage(e.state.page, false);
        } else {
            showMainMenu();
        }
    });

    // --- OPFS Config Manager ---
    const configManager = {
        form: document.querySelector('.config-form'),
        filePath: 'isle.ini',

        async init() {
            if (!this.form) return;
            await this.loadConfig();
            this.form.addEventListener('change', () => this.saveConfig());
        },

        async getFileHandle() {
            try {
                const root = await navigator.storage.getDirectory();
                return await root.getFileHandle(this.filePath, { create: true });
            } catch (e) {
                console.error("OPFS not available or permission denied.", e);
                document.getElementById('opfs-disabled').style.display = '';
                document.getElementById('config-form').querySelectorAll('input, select').forEach(element => {
                    element.disabled = true;
                });
                document.querySelectorAll('.preset-btn').forEach(btn => {
                    btn.disabled = true;
                });
                return null;
            }
        },

        async saveConfig() {
            // This function now uses an inline Web Worker for maximum compatibility,
            // especially with Safari, which does not support createWritable().

            let iniContent = '[isle]\n';
            const elements = this.form.elements;

            for (const element of elements) {
                if (!element.name || element.dataset.notIni == "true") continue;

                let value;
                switch (element.type) {
                    case 'checkbox':
                        value = element.checked ? 'YES' : 'NO';
                        iniContent += `${element.name}=${value}\n`;
                        break;
                    case 'radio':
                        if (element.checked) {
                            value = element.value;
                            iniContent += `${element.name}=${value}\n`;
                        }
                        break;
                    default:
                        value = element.value;
                        iniContent += `${element.name}=${value}\n`;
                        break;
                }
            }

            iniContent += "[extensions]\n";

            if (hdTextures) {
                value = hdTextures.checked ? 'YES' : 'NO';
                iniContent += `${hdTextures.name}=${value}\n`;
            }

            siFiles = getSiFiles();
            if (siFiles.length > 0 || outroFmv.checked) {
                iniContent += `SI Loader=YES\n`;
                iniContent += "[si loader]\n";
            }

            if (siFiles.length > 0) {
                iniContent += `files=${siFiles.join(',')}\n`;
            }

            let directives = [];

            if (outroFmv.checked) {
                directives = directives.concat([
                    "FullScreenMovie:\\lego\\scripts\\intro:3",
                    "Disable3d:\\lego\\scripts\\credits:499",
                    "Prepend:\\lego\\scripts\\intro:3:\\lego\\scripts\\credits:499",
                    "RemoveWith:\\lego\\scripts\\credits:499:\\lego\\scripts\\intro:3"
                ]);
            }

            if (directives.length > 0) {
                iniContent += `directives=${directives.join(",\\\n")}\n`;
            }

            const workerCode = `
                        self.onmessage = async (e) => {
                            if (e.data.action === 'save') {
                                try {
                                    const root = await navigator.storage.getDirectory();
                                    const handle = await root.getFileHandle(e.data.filePath, { create: true });
                                    const accessHandle = await handle.createSyncAccessHandle();
                                    const encoder = new TextEncoder();
                                    const encodedData = encoder.encode(e.data.content);

                                    accessHandle.truncate(0);
                                    accessHandle.write(encodedData, { at: 0 });
                                    accessHandle.flush();
                                    accessHandle.close();

                                    self.postMessage({ status: 'success', message: 'Config saved to ' + e.data.filePath });
                                } catch (err) {
                                    self.postMessage({ status: 'error', message: 'Failed to save config: ' + err.message });
                                }
                            }
                        };
                    `;

            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);

            worker.postMessage({
                action: 'save',
                content: iniContent,
                filePath: this.filePath
            });

            worker.onmessage = (e) => {
                console.log(e.data.message);
                URL.revokeObjectURL(workerUrl); // Clean up the temporary URL
                worker.terminate();
                if (e.data.status === 'success') {
                    showConfigToast();
                }
            };

            worker.onerror = (e) => {
                console.error('An error occurred in the config-saving worker:', e.message);
                URL.revokeObjectURL(workerUrl);
                worker.terminate();
            };
        },

        async loadConfig() {
            const handle = await this.getFileHandle();
            if (!handle) return;

            const file = await handle.getFile();
            const text = await file.text();
            if (!text) {
                console.log('No existing config file found, using defaults.');
                await this.saveConfig();
                return;
            }

            const config = {};
            const lines = text.split('\n');
            for (const line of lines) {
                if (line.startsWith('[') || !line.includes('=')) continue;
                const [key, ...valueParts] = line.split('=');
                const value = valueParts.join('=').trim();
                config[key.trim()] = value;
            }

            this.applyConfigToForm(config);
            console.log('Config loaded from', this.filePath);
        },

        applyConfigToForm(config) {
            const elements = this.form.elements;
            for (const key in config) {
                if (key == "files") {
                    elements["HD Music"].checked = config[key].includes("hdmusic.si");
                    elements["Widescreen Backgrounds"].checked = config[key].includes("widescreen.si");
                    elements["Extended Bad Ending FMV"].checked = config[key].includes("badend.si");
                    continue;
                }

                if (key == "directives") {
                    elements["Outro FMV"].checked = config[key].includes("intro:3");
                    continue;
                }

                const element = elements[key];
                if (!element) continue;

                const value = config[key];

                if (element.type === 'checkbox') {
                    element.checked = (value === 'YES');
                } else if (element.nodeName === 'RADIO') { // radio nodelist
                    for (const radio of element) {
                        if (radio.value === value) {
                            radio.checked = true;
                            break;
                        }
                    }
                }
                else {
                    element.value = value;
                }
            }
        }
    };

    // Handle initial page load with a hash
    const initialHash = window.location.hash;
    if (initialHash) {
        const initialPageId = initialHash + '-page';
        if (document.querySelector(initialPageId)) {
            const urlPath = window.location.pathname;
            history.replaceState({ page: 'main' }, '', urlPath);
            showPage(initialPageId, true);
        }
    } else {
        history.replaceState({ page: 'main' }, '', window.location.pathname);
    }

    if (document.documentElement.requestFullscreen) {
        const fullscreenElement = document.getElementById('window-fullscreen');
        const windowedElement = document.getElementById('window-windowed');

        fullscreenElement.addEventListener('change', () => {
            if (fullscreenElement.checked) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
                });
            }
        });

        windowedElement.addEventListener('change', () => {
            if (windowedElement.checked && document.fullscreenElement) {
                document.exitFullscreen();
            }
        });

        // Event listener for changes in fullscreen state (e.g., F11 or Esc key)
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                fullscreenElement.checked = true;
            } else {
                windowedElement.checked = true;
            }
        });
    }
    else {
        document.getElementById('window-form').style.display = 'none';
    }

    if (!window.matchMedia('(any-pointer: coarse)').matches) {
        document.getElementById('touch-section').style.display = 'none';
    }

    const gl = document.createElement('canvas').getContext('webgl2');
    if (gl) {
        const samples = gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA8, gl.SAMPLES);
        if (samples && samples.length > 0 && Math.max(...samples) > 1) {
            msaaSelect.innerHTML = '';
            const offOption = document.createElement('option');
            offOption.value = '1';
            offOption.textContent = 'Off';
            msaaSelect.appendChild(offOption);
            samples.sort().forEach(sampleCount => {
                if (sampleCount > 1) {
                    const option = document.createElement('option');
                    option.value = sampleCount;
                    option.textContent = `${sampleCount}x`;
                    msaaSelect.appendChild(option);
                }
            });
        } else {
            msaaGroup.style.display = 'none';
        }

        const ext = gl.getExtension('EXT_texture_filter_anisotropic');
        if (ext) {
            const maxAnisotropy = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);

            afSelect.innerHTML = '';

            const offOption = document.createElement('option');
            offOption.value = '1';
            offOption.textContent = 'Off';
            afSelect.appendChild(offOption);

            const defaultAniso = Math.min(maxAnisotropy, 16);

            for (let i = 2; i <= maxAnisotropy; i *= 2) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}x`;
                option.selected = defaultAniso == i;
                afSelect.appendChild(option);
            }
        } else {
            afGroup.style.display = 'none';
        }
    } else {
        msaaGroup.style.display = 'none';
        afGroup.style.display = 'none';
    }

    let downloaderWorker = null;
    let missingGameFiles = [];

    // Update popup elements
    const updatePopup = document.getElementById('update-popup');
    const updateReloadBtn = document.getElementById('update-reload-btn');
    const updateDismissBtn = document.getElementById('update-dismiss-btn');

    let waitingServiceWorker = null;

    function showUpdatePopup(waitingSW) {
        if (updatePopup) {
            updatePopup.style.display = 'flex';
            waitingServiceWorker = waitingSW;
        }
    }

    function hideUpdatePopup() {
        if (updatePopup) {
            updatePopup.style.display = 'none';
        }
    }

    if (updateReloadBtn) {
        updateReloadBtn.addEventListener('click', () => {
            if (waitingServiceWorker) {
                waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
            }
            window.location.reload();
        });
    }

    if (updateDismissBtn) {
        updateDismissBtn.addEventListener('click', () => {
            hideUpdatePopup();
        });
    }

    // Goodbye popup elements
    const goodbyePopup = document.getElementById('goodbye-popup');
    const goodbyeCancelBtn = document.getElementById('goodbye-cancel-btn');
    const goodbyeProgressBar = document.querySelector('.goodbye-progress-bar');
    const cancelBtn = document.getElementById('cancel-btn');
    let goodbyeTimeout = null;
    let goodbyeInterval = null;

    function showGoodbyePopup() {
        if (goodbyePopup && goodbyePopup.style.display !== 'flex') {
            goodbyePopup.style.display = 'flex';
            if (goodbyeProgressBar) {
                goodbyeProgressBar.style.width = '0%';
            }
            startGoodbyeCountdown();
        }
    }

    function hideGoodbyePopup() {
        if (goodbyePopup) {
            goodbyePopup.style.display = 'none';
        }
        if (goodbyeTimeout) {
            clearTimeout(goodbyeTimeout);
            goodbyeTimeout = null;
        }
        if (goodbyeInterval) {
            clearInterval(goodbyeInterval);
            goodbyeInterval = null;
        }
    }

    function startGoodbyeCountdown() {
        const duration = 4000;
        const startTime = Date.now();

        goodbyeInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            if (goodbyeProgressBar) {
                goodbyeProgressBar.style.width = (progress * 100) + '%';
            }
            if (progress >= 1) {
                clearInterval(goodbyeInterval);
            }
        }, 50);

        goodbyeTimeout = setTimeout(() => {
            window.location.href = 'https://legoisland.org';
        }, duration);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', showGoodbyePopup);
    }

    if (goodbyeCancelBtn) {
        goodbyeCancelBtn.addEventListener('click', hideGoodbyePopup);
    }

    if ('serviceWorker' in navigator) {
        Promise.all([
            configManager.init(),
            navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready)
        ]).then(([configResult, swRegistration]) => {
            checkInitialCacheStatus();
            showOrHideGraphicsOptions();

            // Check if there's already a waiting service worker (update ready)
            if (swRegistration.waiting) {
                showUpdatePopup(swRegistration.waiting);
            }

            // Listen for new service worker updates
            swRegistration.addEventListener('updatefound', () => {
                const newWorker = swRegistration.installing;
                if (newWorker) {
                    newWorker.addEventListener('statechange', () => {
                        // When the new worker is installed and waiting, show the update popup
                        // Only show if there's an existing controller (this is an update, not first install)
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            showUpdatePopup(newWorker);
                        }
                    });
                }
            });
        }).catch(error => {
            console.error('Initialization failed:', error);
        });

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            checkInitialCacheStatus();
        });
    }
    else {
        configManager.init().then(() => {
            showOrHideGraphicsOptions();
        });
    }

    const progressCircular = document.createElement('div');
    progressCircular.className = 'progress-circular';
    controlsContainer.appendChild(progressCircular);

    installBtn.addEventListener('click', async () => {
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            await requestPersistentStorage();

            if (downloaderWorker) downloaderWorker.terminate();
            downloaderWorker = new Worker('/downloader.js');
            downloaderWorker.onmessage = handleWorkerMessage;

            const selectedLanguage = languageSelect.value;
            installBtn.style.display = 'none';
            uninstallBtn.style.display = 'none';
            progressCircular.style.display = 'flex';
            progressCircular.textContent = '0%';
            progressCircular.style.background = 'conic-gradient(#FFD700 0deg, #333 0deg)';

            downloaderWorker.postMessage({
                action: 'install',
                missingFiles: missingGameFiles,
                language: selectedLanguage
            });
        }
    });

    uninstallBtn.addEventListener('click', () => {
        const selectedLanguage = languageSelect.value;
        navigator.serviceWorker.controller.postMessage({
            action: 'uninstall_language_pack',
            language: selectedLanguage
        });
    });

    languageSelect.addEventListener('change', () => {
        checkInitialCacheStatus();
    });

    hdTextures.addEventListener('change', () => {
        checkInitialCacheStatus();
    });

    hdMusic.addEventListener('change', () => {
        checkInitialCacheStatus();
    });

    widescreenBgs.addEventListener('change', () => {
        checkInitialCacheStatus();
    });

    badEnding.addEventListener('change', () => {
        checkInitialCacheStatus();
    });

    rendererSelect.addEventListener('change', () => {
        showOrHideGraphicsOptions();
    });

    async function requestPersistentStorage() {
        if (navigator.storage && navigator.storage.persist) {
            const isPersisted = await navigator.storage.persisted();
            if (!isPersisted) {
                const wasGranted = await navigator.storage.persist();
                if (wasGranted) {
                    console.log('Persistent storage was granted.');
                } else {
                    console.log('Persistent storage request was denied.');
                }
            }
        }
    }

    function getSiFiles() {
        siFiles = [];
        if (hdMusic && hdMusic.checked) {
            siFiles.push('/LEGO/extra/hdmusic.si');
        }
        if (widescreenBgs && widescreenBgs.checked) {
            siFiles.push('/LEGO/extra/widescreen.si');
        }
        if (badEnding && badEnding.checked) {
            siFiles.push('/LEGO/extra/badend.si');
        }
        return siFiles;
    }

    function checkInitialCacheStatus() {
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
                action: 'check_cache_status',
                language: languageSelect.value,
                hdTextures: hdTextures.checked,
                siFiles: getSiFiles(),
            });
        }
    }

    function showOrHideGraphicsOptions() {
        if (rendererSelect.value == "0 0x682656f3 0x0 0x0 0x2000000") {
            msaaGroup.style.display = 'none';
            afGroup.style.display = 'none';
        }
        else {
            msaaGroup.style.display = '';
            afGroup.style.display = '';
        }
    }

    function updateInstallUI(isInstalled, inProgress = false) {
        progressCircular.style.display = inProgress ? 'flex' : 'none';
        installBtn.style.display = !isInstalled && !inProgress ? 'block' : 'none';
        uninstallBtn.style.display = isInstalled && !inProgress ? 'block' : 'none';
    }

    function handleServiceWorkerMessage(event) {
        const { action, language, isInstalled, success } = event.data;
        if (language && language !== languageSelect.value) return;

        switch (action) {
            case 'cache_status':
                missingGameFiles = event.data.missingFiles;
                updateInstallUI(isInstalled);
                break;
            case 'uninstall_complete':
                updateInstallUI(!success);
                checkInitialCacheStatus();
                break;
        }
    }

    function handleWorkerMessage(event) {
        const { action, progress, success, error } = event.data;

        switch (action) {
            case 'install_progress':
                updateInstallUI(false, true);
                const angle = (progress / 100) * 360;
                progressCircular.textContent = `${Math.round(progress)}%`;
                progressCircular.style.background = `radial-gradient(#181818 60%, transparent 61%), conic-gradient(#FFD700 ${angle}deg, #333 ${angle}deg)`;
                break;
            case 'install_complete':
                updateInstallUI(success);
                if (downloaderWorker) downloaderWorker.terminate();
                break;
            case 'install_failed':
                alert(`Download failed: ${error}`);
                updateInstallUI(false);
                if (downloaderWorker) downloaderWorker.terminate();
                break;
        }
    }
});
