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
        { id: 'manual', label: 'Manual', icon: 'images/bonus.webp' },
        { id: 'voices', label: 'Voices', icon: 'images/send.webp' }
    ];

    const faqItems = [
        { id: 'faq1', question: 'Is this the same game as the original?', answer: `<p>This is a complete port of the original 1997 PC game — the core gameplay is identical. You can select from multiple languages, including both the 1.0 and 1.1 versions of English, from the Configure page before starting.</p><p>On top of that, this version includes enhancements like widescreen support, improved controls, many bug fixes from the decompilation project, and the ability to run at your display's maximum resolution (even 4K!). Check out the <a href="#configure">Configure</a> page to see what's possible.</p>` },
        { id: 'faq2', question: 'Can I save my progress?', answer: `<p>Yes! The game automatically saves your progress. To ensure your game is saved, return to the Infocenter and use the exit door. This will bring you back to the main menu and lock in your save state. A "best effort" save is also attempted if you close the tab directly, but this method isn't always guaranteed.</p>` },
        { id: 'faq3', question: 'Does this run on mobile?', answer: `<p>Yes! The game is designed to work on a wide range of devices, including desktops, laptops, tablets, and phones. It has even been seen running on <a href="https://github.com/isledecomp/isle-portable/issues/418#issuecomment-3003572219" target="_blank" rel="noopener noreferrer">Tesla in-car browsers</a>!</p>` },
        { id: 'faq4', question: 'Which browsers are supported?', answer: `<p>See the System tab for a full list of supported browsers and minimum versions. For the best experience on iOS, make sure you're running iOS 18 or newer.</p>` },
        { id: 'faq5', question: 'What are the controls?', answer: `<p>You can play using a keyboard and mouse, a gamepad, or a touch screen. Gamepad support can vary depending on your browser. On mobile, you can select your preferred touch control scheme in the <a href="#configure">Configure</a> menu.</p>` },
        { id: 'faq6', question: 'Can I play offline?', answer: `<p>You bet! On the <a href="#configure">Configure</a> page, open the "Extras" tab and expand the "Offline Play" section. From there you can install all necessary game files (about 550MB) for offline access.</p>` },
        { id: 'faq7', question: "I don't hear any sound or music. How do I fix it?", answer: `<p>Most modern browsers block audio until you interact with the page. Click the mute icon on the animated intro to enable sound.</p>` },
        { id: 'faq8', question: 'I think I found a bug! Where do I report it?', answer: `<p>As an active development project, some bugs are expected. If you find one, we'd be grateful if you'd report it on the isle-portable <a href="https://github.com/isledecomp/isle-portable/issues" target="_blank" rel="noopener noreferrer">GitHub Issues page</a>. Please include details about your browser, device, and what you were doing when the bug occurred.</p>` },
        { id: 'faq9', question: 'Is this project open-source?', answer: `<p>Yes, absolutely! This web port is built upon the incredible open-source <a href="https://github.com/isledecomp/isle-portable" target="_blank" rel="noopener noreferrer">LEGO Island (portable)</a> project, and the code for this website is also <a href="https://github.com/isledecomp/isle.pizza" target="_blank" rel="noopener noreferrer">available here</a>.</p>` }
    ];

    const changelogItems = [
        { id: 'cl0', title: 'April 2026', items: [
            { type: 'New', text: 'Multiplayer mode — create public or private islands and explore LEGO Island together with up to 16 players in real time' },
            { type: 'New', text: 'Scene Player lets you watch over 300 original LEGO Island animations with playback controls and shareable links' },
            { type: 'New', text: 'Memories page — reenact original in-game animations with other players in multiplayer and collect them as memories' },
            { type: 'New', text: 'Cloud Sync automatically backs up your save files and config across devices when signed in' },
            { type: 'New', text: 'Sign in with Discord to enable cloud sync, memories, and multiplayer features' },
            { type: 'New', text: 'Crash reporting overlay captures diagnostics and lets you submit reports when something goes wrong' }
        ]},
        { id: 'cl1', title: 'March 2026', items: [
            { type: 'New', text: 'Voices tab on the Read Me page showcases reactions from the original LEGO Island development team' }
        ]},
        { id: 'cl2', title: 'February 2026', items: [
            { type: 'New', text: 'Save Editor lets you view and modify save files — change your player name, character, and high scores directly from the browser' },
            { type: 'New', text: 'Sky Color Editor allows customizing the island sky gradient colors in your save file' },
            { type: 'New', text: 'Vehicle Part Editor enables modifying vehicle parts and colors with a 3D preview' },
            { type: 'New', text: 'Vehicle Texture Editor lets you customize vehicle textures with default presets or your own uploaded images' },
            { type: 'New', text: 'Actor Editor with animated 3D character preview — customize hats, colors, moods, sounds, and moves for all 66 game actors' },
            { type: 'New', text: 'Plant Editor lets you browse and customize all 81 island plants — change variants, colors, moods, sounds, and moves with click interactions that match the original in-game behavior per character' },
            { type: 'New', text: 'Building Editor lets you browse and customize all island buildings — change variants, sounds, and moves with a 3D preview' },
            { type: 'New', text: 'Vehicle rendering in Actor Editor — toggle to see actors with their assigned vehicles' },
            { type: 'New', text: 'Click animations and sound effects in Actor and Plant Editors matching the original game behavior' },
            { type: 'New', text: 'Drag-to-orbit, zoom, and pan controls on all 3D previews (vehicle, actor, plant, and score cube editors)' },
            { type: 'New', text: 'Camera reset button on 3D editors to restore the default view' },
            { type: 'Improved', text: 'Save Editor tabs now use a carousel with arrow navigation for easier browsing on small screens' },
            { type: 'Fixed', text: 'Sticky hover highlights on touch devices for editor buttons' }
        ]},
        { id: 'cl3', title: 'January 2026', items: [
            { type: 'New', text: 'Debug menu for developers and power users. Tap the LEGO Island logo 5 times to unlock OGEL mode and access debug features like teleporting to locations, switching acts, and playing animations' },
            { type: 'Improved', text: 'Configure page redesigned with tabbed navigation, collapsible sections, quick presets (Classic/Modern Mode), and modern toggle switches' },
            { type: 'Improved', text: 'Read Me page reorganized into tabs (About, System, FAQ, Changelog, Manual) with the original instruction manual now viewable in-browser' },
            { type: 'Fixed', text: 'Safari audio not playing on first toggle' },
            { type: 'Fixed', text: 'Tooltips not working correctly on mobile devices' }
        ]},
        { id: 'cl4', title: 'December 2025', items: [
            { type: 'New', text: '"Active in Background" option keeps the game running when the tab loses focus' },
            { type: 'New', text: 'WASD navigation controls as an alternative to arrow keys' },
            { type: 'Fixed', text: 'Act 3 helicopter ammo now correctly sticks to targets and finishes animations' },
            { type: 'Fixed', text: 'Pick/click distance calculation for more accurate object selection' },
            { type: 'Fixed', text: 'Maximum deltaTime capping prevents physics glitches in races' },
            { type: 'Fixed', text: 'Touch controls now properly support widescreen aspect ratios' },
            { type: 'Improved', text: 'Default anisotropic filtering increased to 16x for sharper textures' }
        ]},
        { id: 'cl5', title: 'November 2025', items: [
            { type: 'Fixed', text: 'Dictionary loading failure no longer causes crashes' },
            { type: 'Fixed', text: 'INI configuration now properly applies defaults when values are missing' }
        ]},
        { id: 'cl6', title: 'September 2025', items: [
            { type: 'New', text: 'Additional widescreen background images' },
            { type: 'Fixed', text: 'Jukebox state now correctly restored when using HD Music extension' },
            { type: 'Fixed', text: 'Background audio no longer gets stuck when starting audio fails' },
            { type: 'Improved', text: 'SI Loader actions now start at the correct time during world loading' }
        ]},
        { id: 'cl7', title: 'August 2025', items: [
            { type: 'New', text: 'Extended Bad Ending FMV extension shows the uncut beta animation' },
            { type: 'New', text: 'HD Music extension with high-quality audio' },
            { type: 'New', text: 'Widescreen backgrounds extension eliminates 3D edges on wide displays' },
            { type: 'New', text: 'SI Loader extension system for community content and modifications' },
            { type: 'New', text: 'OpenGL ES 2.0/3.0 renderer for broader device compatibility' },
            { type: 'Fixed', text: 'Purple edges no longer appear on scaled transparent 2D elements' },
            { type: 'Fixed', text: 'Transparent pixels now render correctly with alpha channel support' }
        ]},
        { id: 'cl8', title: 'July 2025', items: [
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
        { id: 'cl9', title: 'June 2025 — Initial Release', items: [
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
                <p>Play the classic 1997 LEGO Island — right in your browser. This is a faithful recreation of the
                    original PC game, rebuilt with Emscripten and WebAssembly to run on modern devices without any
                    installation.</p>
                <p>This project was made possible by the <a href="https://github.com/isledecomp/isle" target="_blank"
                        rel="noopener noreferrer">LEGO Island decompilation</a>, which achieved a complete,
                    byte-accurate reconstruction of the original source code. That work was then transformed into a
                    <a href="https://github.com/isledecomp/isle-portable" target="_blank"
                        rel="noopener noreferrer">portable version</a> that replaced every Windows dependency with
                    modern, cross-platform alternatives — from graphics and audio to input and configuration.</p>
                <p>Thanks to years of effort from many dedicated contributors, LEGO Island now runs on over 10 platforms
                    including Windows, Linux, macOS, iOS, Android, Nintendo Switch, PlayStation Vita, and the web. The
                    browser version even uses the original Interleaf streaming code, progressively loading content just
                    like the 1997 CD-ROM.</p>
                <p>Our goal is to make this classic accessible to everyone. The project is still in active development,
                    so you may encounter the occasional bug — your patience and feedback are greatly appreciated!</p>
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
                    <p>The game supports multiple ways to play. Visit the <a href="#configure">Configure</a> page to adjust your control preferences.</p>
                    <ul class="requirements-list">
                        <li><strong>Keyboard &amp; Mouse</strong> — Traditional desktop controls using arrow keys or WASD</li>
                        <li><strong>Gamepad</strong> — Controller support with analog sticks and D-pad</li>
                        <li><strong>Touch Screen</strong> — Mobile-friendly controls with configurable schemes</li>
                    </ul>
                </div>

                <div class="requirements-section">
                    <h3>Audio</h3>
                    <p>If the game is silent, click the mute icon on the animated intro to enable sound —
                        browsers require a user interaction before playing audio.</p>
                </div>

                <div class="requirements-section">
                    <h3>Storage &amp; Network</h3>
                    <p>The game streams approximately <strong>25MB</strong> of data on first load (more with extensions enabled).
                        For offline play, you can install the full game (about <strong>550MB</strong>) via the <a href="#configure">Configure</a> menu.
                        A stable internet connection is recommended for initial loading.</p>
                </div>

                <div class="requirements-section">
                    <h3>Performance Tips</h3>
                    <ul class="requirements-list">
                        <li>Close other browser tabs to free up memory</li>
                        <li>Use hardware acceleration (enabled by default in most browsers)</li>
                        <li>On mobile, ensure your device isn't in low-power mode</li>
                        <li>If experiencing lag, try reducing the resolution in <a href="#configure">Configure</a></li>
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
                    <p class="manual-description">The original comic-style instruction manual from the 1997 CD-ROM release.</p>
                    <a href="pdf/comic.pdf" target="_blank" rel="noopener" class="manual-open-btn">Open Manual in New Tab</a>
                </div>
            </div>

            <div class="tab-panel" class:active={activeTab === 'voices'} id="tab-voices">
                <p class="voices-intro">Reactions from the original LEGO Island development team:</p>
                <div class="voices-grid">
                    <blockquote class="voice-card">
                        <p>This is just fantastic! What an endeavor! It is a wonderful tribute to a team that was
                            unparalleled in talent, and we should now include you and your team in that august group.
                            I really wish Wes was around to see it. Keep us posted on updates...</p>
                        <footer>
                            <span class="voice-name">Scott Anderson</span>
                            <span class="voice-role">Sr. Producer / Senior Project Manager / Co-Creator</span>
                            <span class="voice-tagline">Honorary Mayor of LEGO Island</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Wow; what a trip. My first trial was on my mac; which had problems displaying any of the
                            bitmaps applied to the characters in the safari web browser. But it ran, with some
                            navigation frustrations. But being delivered over the web means any fix you make goes out
                            immediately. I want you all to know it was a joy to work on and how grateful I am to have
                            been a part of the origin. I hope you are getting joy from working on it and keeping it alive.</p>
                        <footer>
                            <span class="voice-name">Dennis Goodrow</span>
                            <span class="voice-role">Director of Development / Lead Programmer / Co-Creator</span>
                            <span class="voice-tagline">Voted "Best Neighbor on LEGO Island" for two years in a row</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>This is pretty neat. At least as responsive over the web as the game was on the target
                            machines of the time! I hadn't heard of WebAssembly until now. What kind of changes to
                            the source were needed to get it working under WebAssembly? I foresee many hours of my
                            time being used up experimenting with this tool!</p>
                        <footer>
                            <span class="voice-name">Jim Brown</span>
                            <span class="voice-role">Programming Wizard / The Godfather of Code</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Well done and such fun tapping back into such fond creative memories.</p>
                        <footer>
                            <span class="voice-name">Paul J. Melmed, Ph.D.</span>
                            <span class="voice-role">Director of Education and Research / Co-Creator</span>
                            <span class="voice-tagline">Resident Shrink and Friend to all on LEGO Island</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>That's awesome!</p>
                        <footer>
                            <span class="voice-name">Randy Yen-pang Chou</span>
                            <span class="voice-role">3D Programming / Emperor of Quoternia</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Fantastic! Love it.</p>
                        <footer>
                            <span class="voice-name">Kevin Byall</span>
                            <span class="voice-role">Highly Caffeinated Artist, Animator</span>
                        </footer>
                    </blockquote>
                    <blockquote class="voice-card">
                        <p>Great stuff!</p>
                        <footer>
                            <span class="voice-name">Dave Cherry</span>
                            <span class="voice-role">Artist, Animator. Works on Sundaes, too!</span>
                        </footer>
                    </blockquote>
                </div>
            </div>
        </div>
    </div>
</div>

<style>
/* Read Me Tabs */
.readme-tabs {
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid var(--color-border-medium);
    width: 100%;
}

.tab-buttons {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    margin-bottom: 20px;
}

.tab-btn {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    flex: 1 1 calc(33.333% - 10px);
    min-width: 0;
    gap: 10px;
    padding: 12px 24px;
    background-color: var(--color-bg-card);
    border: 2px solid var(--color-border-dark);
    border-radius: 8px;
    color: var(--color-text-muted);
    font-size: 1em;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tab-btn:hover {
    background-color: #252525;
    border-color: var(--color-border-light);
    color: var(--color-text-medium);
}

.tab-btn.active {
    background-color: #2a2a00;
    border-color: var(--color-primary);
    color: var(--color-primary);
}

.tab-icon {
    width: 52px;
    height: 52px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--color-border-medium);
}

.tab-btn.active .tab-icon {
    border-color: var(--color-primary);
}

.tab-panel {
    display: none;
    text-align: left;
}

.tab-panel.active {
    display: block;
}

.tab-panel > p {
    color: var(--color-text-medium);
    line-height: 1.6;
    font-size: 1em;
    margin-bottom: 15px;
}

.tab-panel > p a {
    color: var(--color-primary);
    text-decoration: none;
}

.tab-panel > p a:hover {
    text-decoration: underline;
}

/* Voices Section */
.voices-intro {
    color: var(--color-text-medium);
    font-size: 1em;
    margin-bottom: 24px;
    text-align: center;
    line-height: 1.6;
}

.voices-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
}

.voice-card {
    background: linear-gradient(135deg, var(--color-bg-card) 0%, var(--color-bg-elevated) 100%);
    border: 1px solid var(--color-border-dark);
    border-radius: 12px;
    padding: 24px 24px 20px;
    margin: 0;
    position: relative;
    transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
}

.voice-card::before {
    content: '\201C';
    position: absolute;
    top: 12px;
    left: 16px;
    font-size: 3em;
    line-height: 1;
    color: var(--color-primary);
    opacity: 0.25;
    font-family: Georgia, serif;
}

.voice-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-3px);
    box-shadow: 0 8px 24px rgba(255, 215, 0, 0.08);
}

.voice-card p {
    color: var(--color-text-medium);
    font-size: 0.95em;
    line-height: 1.7;
    margin: 8px 0 16px 0;
    font-style: italic;
}

.voice-card footer {
    padding-top: 12px;
    border-top: 1px solid var(--color-border-dark);
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.voice-name {
    color: var(--color-primary);
    font-size: 0.95em;
    font-weight: bold;
}

.voice-name::before {
    content: '— ';
}

.voice-role {
    color: var(--color-text-muted);
    font-size: 0.8em;
}

.voice-tagline {
    color: var(--color-text-muted);
    font-size: 0.75em;
    font-style: italic;
    opacity: 0.8;
}

/* Manual Section */
.manual-container {
    display: flex;
    align-items: center;
    gap: 15px;
}

.manual-description {
    color: var(--color-text-muted);
    font-size: 0.95em;
    margin: 0;
}

.manual-open-btn {
    display: inline-block;
    padding: 12px 24px;
    background: var(--gradient-panel);
    border: 1px solid var(--color-primary);
    border-radius: 8px;
    color: var(--color-primary);
    font-size: 1em;
    font-weight: bold;
    text-decoration: none;
    transition: all 0.2s ease;
}

.manual-open-btn:hover {
    background: var(--gradient-hover);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
}

/* Requirements Section */
.requirements-section {
    background-color: var(--color-bg-card);
    border: 1px solid var(--color-border-dark);
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;
}

.requirements-section h3 {
    color: var(--color-primary);
    font-size: 1.1em;
    margin: 0 0 12px 0;
}

.requirements-section p {
    color: var(--color-text-medium);
    font-size: 0.95em;
    line-height: 1.6;
    margin: 0 0 12px 0;
}

.requirements-section p:last-child {
    margin-bottom: 0;
}

.requirements-list {
    margin: 0;
    padding-left: 20px;
    color: var(--color-text-medium);
}

.requirements-list li {
    font-size: 0.95em;
    line-height: 1.6;
    margin-bottom: 8px;
}

.requirements-list li:last-child {
    margin-bottom: 0;
}

.requirements-list li strong {
    color: #e0e0e0;
}

.requirements-note {
    font-size: 0.85em !important;
    color: var(--color-text-muted) !important;
    font-style: italic;
}

@media (max-width: 768px) {
    .tab-btn {
        padding: 10px 18px;
        font-size: 0.9em;
    }

    .tab-icon {
        width: 42px;
        height: 42px;
    }

    .tab-buttons {
        flex-wrap: wrap;
    }

    .tab-btn {
        flex: 1 1 calc(50% - 5px);
        min-width: 0;
    }

    .voices-grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 480px) {
    .tab-buttons {
        gap: 8px;
    }

    .tab-btn {
        padding: 8px 12px;
        font-size: 0.75em;
        gap: 6px;
    }

    .tab-icon {
        width: 28px;
        height: 28px;
    }
}
</style>
