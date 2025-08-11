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
    const widescreenBgs = document.getElementById('check-widescreen-bgs');

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
    emscriptenCanvas.addEventListener('presenterProgress', function (event) {
        // Intro animation is ready
        if (event.detail.objectName == 'Lego_Smk' && event.detail.tickleState == 1) {
            loadingGifOverlay.style.display = 'none';
            emscriptenCanvas.style.setProperty('display', 'block', 'important');
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

            if (hdTextures || widescreenBgs) {
                iniContent += "[extensions]\n";
            }

            if (hdTextures) {
                value = hdTextures.checked ? 'YES' : 'NO';
                iniContent += `${hdTextures.name}=${value}\n`;
            }

            siFiles = getSiFiles();
            if (siFiles.length > 0) {
                iniContent += `SI Loader=YES\n`;
                iniContent += "[si loader]\n";
                iniContent += `files=${siFiles.join(',')}\n`;
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
                    elements["Widescreen Backgrounds"].checked = config[key].includes("widescreen.si");
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

            for (let i = 2; i <= maxAnisotropy; i *= 2) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `${i}x`;
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

    if ('serviceWorker' in navigator) {
        Promise.all([
            configManager.init(),
            navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready)
        ]).then(([configResult, swRegistration]) => {
            checkInitialCacheStatus();
            showOrHideGraphicsOptions();
        }).catch(error => {
            console.error('Initialization failed:', error);
        });

        navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
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

    widescreenBgs.addEventListener('change', () => {
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
        if (widescreenBgs && widescreenBgs.checked) {
            siFiles.push('/LEGO/extra/widescreen.si');
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
