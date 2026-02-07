<script>
    import BackButton from './BackButton.svelte';

    const resources = [
        { href: 'https://www.youtube.com/watch?v=bG55COe_f8I', title: 'The Making of LEGO Island: A Documentary', desc: 'An in-depth documentary by MattKC that explores the fascinating and chaotic development story behind the classic game.' },
        { href: 'https://www.youtube.com/watch?v=Poaxx9sMxjw', title: 'LEGO Island Radio 24/7', desc: 'Enjoy the iconic, high-quality soundtrack of LEGO Island anytime with this continuous live stream, complete with the original DJ interludes.' },
        { href: 'https://www.legoisland.org/', title: 'LEGO Island Wiki', desc: 'Your ultimate resource for all things LEGO Island. This fan-run wiki contains a wealth of information, research, and details about the game.' },
        { href: 'https://github.com/isledecomp/isle', title: 'LEGO Island Decompilation', desc: 'The core open-source project that reverse-engineered the original game, making this web port and other mods possible. Dive into the source code here.' },
        { href: 'https://github.com/isledecomp/isle-portable', title: 'LEGO Island, Portable Version', desc: 'A portable, cross-platform version of the decompilation project which serves as the direct foundation for this web-based port.' },
        { href: 'https://github.com/isledecomp/isle.pizza', title: 'isle.pizza Frontend', desc: 'The source code for this website! A custom-built frontend for the Emscripten version of the portable decompilation project.' },
        { href: 'https://github.com/isledecomp/LEGOIslandRebuilder', title: 'LEGO Island Rebuilder', desc: 'A powerful launcher and tool for patching and modding the original 1997 PC version of LEGO Island. Essential for play and modding.' },
        { href: 'https://github.com/isledecomp/SIEdit', title: 'SIEdit', desc: 'A suite of tools developed by the decompilation team for viewing and editing the ".si" script and resource files from the original game.' },
        { href: 'https://www.legoisland.org/wiki/The_Making_of_LEGO_Island', title: 'The Making of LEGO Island, a memoir by Wes Jenkins', desc: 'Read the fascinating, incomplete memoir from Creative Director Wes Jenkins, detailing the development process and the team behind the game.' },
        { href: '/pdf/poster.pdf', title: 'LEGO Island: Free Poster', desc: 'Download a copy of the iconic poster that was originally included with the retail release of the game.' },
        { href: 'https://brickstobytes.org/games/lego-island', title: 'Development Materials Archive', desc: 'Explore a collection of development materials, concept art, and other historical assets from the creation of LEGO Island.' },
        { href: 'https://le717.github.io/LEGO-Island-VGF/legoisland/#interview', title: 'Video Game Flashback: An Interview with Wes Jenkins', desc: 'A detailed interview with LEGO Island\'s Creative Director, Wes Jenkins, offering unique insights into the game\'s production.' },
        { href: 'https://www.youtube.com/watch?v=fodBG_QylVM', title: 'LEGO Island - Behind the Scenes', desc: 'Watch a rare promotional video created during the game\'s development, showcasing its progress and vision at the time.' },
        { href: 'https://tcrf.net/LEGO_Island', title: 'The Cutting Room Floor', desc: 'Discover unused assets, hidden data, and other secrets left in the retail version of the game. A fascinating look at what might have been.' },
        { href: 'https://projectisland.org/music/', title: 'Project Island High Quality Music', desc: 'A complete, high-quality re-digitization of the LEGO Island soundtrack, restored by the game\'s main composer, Lorin Nelson.' }
    ];
</script>

<div id="free-stuff-page" class="page-content">
    <BackButton />
    <div class="page-inner-content">
        <div class="resource-list">
            <div class="quote-panel">
                <div class="quote-panel-art">
                    <img src="images/congrats.webp" alt="LEGO Island characters celebrating">
                </div>
                <blockquote class="quote-panel-content">
                    <p>"In November of 2010, after all was said and done, I started getting emails from a few kids
                        and some adults telling me how cool they thought LEGO Island was. Some people actually still
                        play it. I was quite thrilled by these emails and actually quite honored."</p>
                    <footer>Wes Jenkins, Creative Director</footer>
                </blockquote>
            </div>
            {#each resources as resource}
                <a href={resource.href} target="_blank" rel="noopener noreferrer" class="resource-item">
                    <h3>{resource.title}</h3>
                    <p>{resource.desc}</p>
                </a>
            {/each}
        </div>
    </div>
</div>
