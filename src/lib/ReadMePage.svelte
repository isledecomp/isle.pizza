<script>
    import BackButton from './BackButton.svelte';
    import Accordion from './Accordion.svelte';
    import { currentPage } from '../stores.js';

    let activeTab = 'about';
    let openItem = null;

    $: if ($currentPage === 'read-me') {
        activeTab = 'about';
        openItem = null;
    }

    const tabs = [
        { id: 'about', label: 'About', icon: 'images/register.webp' },
        { id: 'system', label: 'System', icon: 'images/sysinfo.webp' },
        { id: 'faq', label: 'FAQ', icon: 'images/getinfo.webp' },
        { id: 'changelog', label: 'Changelog', icon: 'images/callfail.webp' },
        { id: 'manual', label: 'Manual', icon: 'images/bonus.webp' }
    ];

    const faqItems = [
        { id: 'faq1', question: 'Is this the full, original game?', answer: `<p>This is a complete port of the original 1997 PC game. You can select from multiple languages, including both the 1.0 and 1.1 versions of English, from the "Configure" menu before starting.</p>` },
        { id: 'faq2', question: 'How does this differ from the original 1997 CD-ROM game?', answer: `<p>The core gameplay is identical, but this version has some great advantages! It runs in your browser with no installation needed and works on modern devices. It also includes enhancements like widescreen support, improved controls, many bug fixes from the decompilation project, and the ability to run at your display's maximum resolution (even 4K!).</p><p>Check out the "Configure" page to see what's possible.</p>` },
        { id: 'faq3', question: 'Can I save my progress?', answer: `<p>Yes! The game automatically saves your progress. To ensure your game is saved, return to the Infocenter and use the exit door. This will bring you back to the main menu and lock in your save state. A "best effort" save is also attempted if you close the tab directly, but this method isn't always guaranteed.</p>` },
        { id: 'faq4', question: 'Does this run on mobile?', answer: `<p>Yes! The game is designed to work on a wide range of devices, including desktops, laptops, tablets, and phones. It has even been seen running on <a href="https://github.com/isledecomp/isle-portable/issues/418#issuecomment-3003572219" target="_blank" rel="noopener noreferrer">Tesla in-car browsers</a>!</p>` },
        { id: 'faq5', question: 'Which browsers are supported?', answer: `<p>This port runs best on recent versions of modern browsers, including Chrome, Firefox, and Safari. For an optimal experience on iOS devices, please ensure you are running iOS 18 or newer.</p>` },
        { id: 'faq6', question: 'What are the controls?', answer: `<p>You can play using a keyboard and mouse, a gamepad, or a touch screen. Gamepad support can vary depending on your browser. On mobile, you can select your preferred touch control scheme in the "Configure" menu.</p>` },
        { id: 'faq7', question: 'Can I play offline?', answer: `<p>You bet! In the "Configure" menu, scroll to the "Offline Play" section. You'll find an option there to install all necessary game files (about 550MB) for offline access.</p>` },
        { id: 'faq8', question: "I don't hear any sound or music. How do I fix it?", answer: `<p>Most modern browsers block audio until you interact with the page. Click the mute icon on the animated intro to enable sound.</p>` },
        { id: 'faq9', question: 'I think I found a bug! Where do I report it?', answer: `<p>As an active development project, some bugs are expected. If you find one, we'd be grateful if you'd report it on the isle-portable <a href="https://github.com/isledecomp/isle-portable/issues" target="_blank" rel="noopener noreferrer">GitHub Issues page</a>. Please include details about your browser, device, and what you were doing when the bug occurred.</p>` },
        { id: 'faq10', question: 'Is this project open-source?', answer: `<p>Yes, absolutely! This web port is built upon the incredible open-source <a href="https://github.com/isledecomp/isle-portable" target="_blank" rel="noopener noreferrer">LEGO Island (portable)</a> project, and the code for this website is also <a href="https://github.com/isledecomp/isle.pizza" target="_blank" rel="noopener noreferrer">available here</a>.</p>` }
    ];

    const changelogItems = [
        { id: 'cl0', title: 'February 2026', items: [
            { type: 'New', text: 'Save Editor lets you view and modify save files — change your player name, character, and high scores directly from the browser' },
            { type: 'New', text: 'Sky Color Editor allows customizing the island sky gradient colors in your save file' },
            { type: 'New', text: 'Vehicle Part Editor enables modifying vehicle parts and colors with a 3D preview' },
            { type: 'New', text: 'Vehicle Texture Editor lets you customize vehicle textures with default presets or your own uploaded images' },
            { type: 'New', text: 'Actor Editor with animated 3D character preview — customize hats, colors, moods, sounds, and moves for all 66 game actors' },
            { type: 'New', text: 'Plant Editor lets you browse and customize all 81 island plants — change variants, colors, moods, sounds, and moves with click interactions that match the original in-game behavior per character' },
            { type: 'New', text: 'Vehicle rendering in Actor Editor — toggle to see actors with their assigned vehicles' },
            { type: 'New', text: 'Click animations and sound effects in Actor and Plant Editors matching the original game behavior' },
            { type: 'New', text: 'Drag-to-orbit, zoom, and pan controls on all 3D previews (vehicle, actor, plant, and score cube editors)' },
            { type: 'New', text: 'Camera reset button on 3D editors to restore the default view' },
            { type: 'Improved', text: 'Save Editor tabs now use a carousel with arrow navigation for easier browsing on small screens' },
            { type: 'Fixed', text: 'Sticky hover highlights on touch devices for editor buttons' }
        ]},
        { id: 'cl1', title: 'January 2026', items: [
            { type: 'New', text: 'Debug menu for developers and power users. Tap the LEGO Island logo 5 times to unlock OGEL mode and access debug features like teleporting to locations, switching acts, and playing animations' },
            { type: 'Improved', text: 'Configure page redesigned with tabbed navigation, collapsible sections, quick presets (Classic/Modern Mode), and modern toggle switches' },
            { type: 'Improved', text: 'Read Me page reorganized into tabs (About, System, FAQ, Changelog, Manual) with the original instruction manual now viewable in-browser' },
            { type: 'Fixed', text: 'Safari audio not playing on first toggle' },
            { type: 'Fixed', text: 'Tooltips not working correctly on mobile devices' }
        ]},
        { id: 'cl2', title: 'December 2025', items: [
            { type: 'New', text: '"Active in Background" option keeps the game running when the tab loses focus' },
            { type: 'New', text: 'WASD navigation controls as an alternative to arrow keys' },
            { type: 'Fixed', text: 'Act 3 helicopter ammo now correctly sticks to targets and finishes animations' },
            { type: 'Fixed', text: 'Pick/click distance calculation for more accurate object selection' },
            { type: 'Fixed', text: 'Maximum deltaTime capping prevents physics glitches in races' },
            { type: 'Fixed', text: 'Touch controls now properly support widescreen aspect ratios' },
            { type: 'Improved', text: 'Default anisotropic filtering increased to 16x for sharper textures' }
        ]},
        { id: 'cl3', title: 'November 2025', items: [
            { type: 'Fixed', text: 'Dictionary loading failure no longer causes crashes' },
            { type: 'Fixed', text: 'INI configuration now properly applies defaults when values are missing' }
        ]},
        { id: 'cl4', title: 'September 2025', items: [
            { type: 'New', text: 'Additional widescreen background images' },
            { type: 'Fixed', text: 'Jukebox state now correctly restored when using HD Music extension' },
            { type: 'Fixed', text: 'Background audio no longer gets stuck when starting audio fails' },
            { type: 'Improved', text: 'SI Loader actions now start at the correct time during world loading' }
        ]},
        { id: 'cl5', title: 'August 2025', items: [
            { type: 'New', text: 'Extended Bad Ending FMV extension shows the uncut beta animation' },
            { type: 'New', text: 'HD Music extension with high-quality audio' },
            { type: 'New', text: 'Widescreen backgrounds extension eliminates 3D edges on wide displays' },
            { type: 'New', text: 'SI Loader extension system for community content and modifications' },
            { type: 'New', text: 'OpenGL ES 2.0/3.0 renderer for broader device compatibility' },
            { type: 'Fixed', text: 'Purple edges no longer appear on scaled transparent 2D elements' },
            { type: 'Fixed', text: 'Transparent pixels now render correctly with alpha channel support' }
        ]},
        { id: 'cl6', title: 'July 2025', items: [
            { type: 'New', text: 'HD Textures extension with enhanced visuals' },
            { type: 'New', text: 'MSAA anti-aliasing support for smoother edges' },
            { type: 'New', text: 'Anisotropic filtering for sharper textures at angles' },
            { type: 'New', text: 'Haptic feedback (vibration) support for gamepads and mobile devices' },
            { type: 'New', text: 'Virtual Gamepad touch control scheme with sliding controls' },
            { type: 'New', text: 'Gamepad/controller support with analog sticks and D-pad' },
            { type: 'New', text: 'Full screen mode with in-game toggle' },
            { type: 'New', text: 'Maximum LOD and Maximum Actors configuration options' },
            { type: 'New', text: 'Configurable transition animations (Mosaic, Dissolve, Wipe, etc.)' },
            { type: 'New', text: 'Extensions system allowing community-created content' },
            { type: 'Fixed', text: 'WebGL driver compatibility issues resolved' },
            { type: 'Fixed', text: 'Firefox Private browsing mode now works correctly' },
            { type: 'Fixed', text: 'Virtual cursor transparency and positioning' },
            { type: 'Fixed', text: 'Touch coordinate translation for proper viewport mapping' },
            { type: 'Fixed', text: 'Memory leaks in ViewLODList' },
            { type: 'Fixed', text: 'Screen transitions on software renderer and 32-bit displays' },
            { type: 'Fixed', text: 'Tabbing in and out of fullscreen' },
            { type: 'Fixed', text: 'Click spam prevention on touch screens' },
            { type: 'Improved', text: 'Mosaic transition animation is faster and cleaner' },
            { type: 'Improved', text: 'Loading UX for HD Textures with progress indicators' }
        ]},
        { id: 'cl7', title: 'June 2025 — Initial Release', items: [
            { type: 'New', text: 'Emscripten web port — play LEGO Island directly in your browser!' },
            { type: 'New', text: 'WebGL rendering for hardware-accelerated 3D graphics' },
            { type: 'New', text: 'Software renderer fallback for devices without WebGL' },
            { type: 'New', text: '32-bit color support for improved visual quality' },
            { type: 'New', text: 'Full screen support' },
            { type: 'New', text: 'Joystick/gamepad enabled by default' },
            { type: 'New', text: 'Option to skip the startup delay' },
            { type: 'New', text: 'Support for LEGO Island 1.0 version' },
            { type: 'New', text: 'FPS display option' },
            { type: 'New', text: 'Game runs without requiring an audio device' },
            { type: 'Fixed', text: 'Infocenter to Act 2/Act 3 transition issues' },
            { type: 'Fixed', text: 'Race initialization errors' },
            { type: 'Fixed', text: 'Jetski race startup issues' },
            { type: 'Fixed', text: 'Plant creation bug in LegoPlantManager' },
            { type: 'Fixed', text: 'Late-game "sawtooth" audio glitches' },
            { type: 'Fixed', text: "Building variant switching (Pepper's buildings)" },
            { type: 'Fixed', text: 'OpenGL rendering issues' },
            { type: 'Fixed', text: 'Image serialization bugs' },
            { type: 'Improved', text: 'Transparent objects now render correctly (sorted last)' },
            { type: 'Improved', text: 'GPU mesh uploading via VBOs for better performance' },
            { type: 'Improved', text: 'Backface culling enabled for faster rendering' },
            { type: 'Improved', text: 'SIMD-optimized z-buffer clearing' },
            { type: 'Improved', text: 'Edge-walking triangle rasterization' }
        ]}
    ];

    function toggleItem(id) {
        openItem = openItem === id ? null : id;
    }
</script>

<div id="read-me-page" class="page-content">
    <BackButton />
    <div class="page-inner-content">
        <h1>Read Me</h1>

        <div class="readme-tabs">
            <div class="tab-buttons">
                {#each tabs as tab}
                    <button
                        class="tab-btn"
                        class:active={activeTab === tab.id}
                        onclick={() => activeTab = tab.id}
                    >
                        <img src={tab.icon} alt="" class="tab-icon">
                        <span>{tab.label}</span>
                    </button>
                {/each}
            </div>

            <div class="tab-panel" class:active={activeTab === 'about'} id="tab-about">
                <p>Welcome to the LEGO Island web port project! This is a recreation of the classic 1997 PC game,
                    rebuilt to run in modern web browsers using Emscripten and WebAssembly.</p>
                <p>This incredible project stands on the shoulders of giants. It was made possible by the original <a
                        href="https://github.com/isledecomp/isle" target="_blank"
                        rel="noopener noreferrer">decompilation project</a>, which achieved 100% decompilation of the
                    original game. This was then adapted into a <a
                        href="https://github.com/isledecomp/isle-portable" target="_blank"
                        rel="noopener noreferrer">portable version</a> that eliminated all Windows dependencies and
                    replaced them with modern, cross-platform alternatives.</p>
                <p>The technical work involved replacing Windows-specific systems with SDL for window management and input,
                    migrating audio from DirectSound to the miniaudio library, converting Windows Registry configuration
                    to INI files, and creating a modular graphics layer supporting multiple rendering backends including
                    WebGL. This represents years of effort from many awesome contributors dedicated to preserving this
                    piece of gaming history.</p>
                <p>Thanks to this work, LEGO Island now runs on over 10 platforms including Windows, Linux, macOS, iOS,
                    Android, Nintendo Switch, PlayStation Vita, and of course, web browsers. The web version uses the
                    original, unmodified Interleaf streaming code, enabling progressive content loading just like the
                    original CD-ROM.</p>
                <p>Our goal is to make this classic accessible to everyone. The project is still in development, so you
                    may encounter bugs. Your patience and feedback are greatly appreciated!</p>
            </div>

            <div class="tab-panel" class:active={activeTab === 'system'} id="tab-system">
                <div class="requirements-section">
                    <h3>Supported Browsers</h3>
                    <p>This game requires a modern browser with WebAssembly multi-threading support. The following browsers are supported:</p>
                    <ul class="requirements-list">
                        <li><strong>Chrome</strong> — version 95 or newer</li>
                        <li><strong>Firefox</strong> — version 92 or newer</li>
                        <li><strong>Edge</strong> — version 95 or newer</li>
                        <li><strong>Safari</strong> — version 15.4 or newer (iOS 18+ recommended)</li>
                    </ul>
                    <p class="requirements-note">For the best experience, keep your browser updated to the latest version.</p>
                </div>

                <div class="requirements-section">
                    <h3>Input Methods</h3>
                    <p>The game supports multiple ways to play. Visit the Configure page to adjust your control preferences.</p>
                    <ul class="requirements-list">
                        <li><strong>Keyboard &amp; Mouse</strong> — Traditional desktop controls using arrow keys or WASD</li>
                        <li><strong>Gamepad</strong> — Controller support with analog sticks and D-pad</li>
                        <li><strong>Touch Screen</strong> — Mobile-friendly controls with configurable schemes</li>
                    </ul>
                </div>

                <div class="requirements-section">
                    <h3>Audio</h3>
                    <p>Audio hardware is recommended for the full experience. If the game is silent, click the mute icon
                        on the animated intro to enable sound. Modern browsers require user interaction before playing audio.</p>
                </div>

                <div class="requirements-section">
                    <h3>Storage &amp; Network</h3>
                    <p>The game streams approximately <strong>25MB</strong> of data on first load (more with extensions enabled).
                        For offline play, you can install the full game (about <strong>550MB</strong>) via the Configure menu.
                        A stable internet connection is recommended for initial loading.</p>
                </div>

                <div class="requirements-section">
                    <h3>Performance Tips</h3>
                    <ul class="requirements-list">
                        <li>Close other browser tabs to free up memory</li>
                        <li>Use hardware acceleration (enabled by default in most browsers)</li>
                        <li>On mobile, ensure your device isn't in low-power mode</li>
                        <li>If experiencing lag, try reducing the resolution in Configure</li>
                    </ul>
                </div>
            </div>

            <div class="tab-panel" class:active={activeTab === 'faq'} id="tab-faq">
                <Accordion items={faqItems} {openItem} onToggle={toggleItem} titleKey="question">
                    <svelte:fragment let:item>
                        {@html item.answer}
                    </svelte:fragment>
                </Accordion>
            </div>

            <div class="tab-panel" class:active={activeTab === 'changelog'} id="tab-changelog">
                <Accordion items={changelogItems} {openItem} onToggle={toggleItem} titleKey="title">
                    <svelte:fragment let:item>
                        <ul>
                            {#each item.items as entry}
                                <li><strong>{entry.type}:</strong> {entry.text}</li>
                            {/each}
                        </ul>
                    </svelte:fragment>
                </Accordion>
            </div>

            <div class="tab-panel" class:active={activeTab === 'manual'} id="tab-manual">
                <div class="manual-container">
                    <p class="manual-description">The original 15-page instruction manual from the 1997 CD-ROM release.</p>
                    <a href="pdf/comic.pdf" target="_blank" rel="noopener" class="manual-open-btn">Open Manual in New Tab</a>
                </div>
            </div>

            <!-- Hidden Voices tab - not shown in tab buttons but content preserved -->
            <div class="tab-panel" class:active={activeTab === 'voices'} id="tab-voices">
                <p class="voices-intro">Reactions from the original LEGO Island development team:</p>
                <div class="voices-grid">
                    <blockquote class="voice-card">
                        <p>This is just fantastic! What an endeavor! It is a wonderful tribute to a team that was
                            unparalleled in talent, and we should now include you and your team in that august group.
                            I really wish Wes was around to see it. Keep us posted on updates...</p>
                        <footer>Scott Anderson</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Wow; what a trip. My first trial was on my mac; which had problems displaying any of the
                            bitmaps applied to the characters in the safari web browser. But it ran, with some
                            navigation frustrations. But being delivered over the web means any fix you make goes out
                            immediately. I want you all to know it was a joy to work on and how grateful I am to have
                            been a part of the origin. I hope you are getting joy from working on it and keeping it alive.</p>
                        <footer>Dennis Goodrow</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>This is pretty neat. At least as responsive over the web as the game was on the target
                            machines of the time! I hadn't heard of WebAssembly until now. What kind of changes to
                            the source were needed to get it working under WebAssembly? I foresee many hours of my
                            time being used up experimenting with this tool!</p>
                        <footer>Jim Brown</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Well done and such fun tapping back into such fond creative memories.</p>
                        <footer>Paul Melmed</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>That's awesome!</p>
                        <footer>Randy Chou</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Fantastic! Love it.</p>
                        <footer>Kevin Byall</footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Great stuff!</p>
                        <footer>Dave Cherry</footer>
                    </blockquote>
                </div>
            </div>
        </div>
    </div>
</div>
