<script>
    // Canvas wrapper for the Emscripten game
</script>

<div id="canvas-wrapper">
    <div id="loading-gif-overlay">
        <img src="cdspin.gif" alt="Loading game...">
        <div class="quote-block">
            <p class="quote-text">"Whoops! You have to put the CD in your computer"</p>
            <p class="quote-attribution">- The Infomaniac (1997)</p>
        </div>
        <div class="loading-info-text">
            <p>"Hello! Hola! Aloha! How ya doin'? YO!" It's your pal, the Infomaniac, with a 2025 update! No need to
                search for that CD case, my friend!</p>
            <p>This amazing LEGO Island adventure is now streaming directly from... well, from a really, really big
                digital box of bricks! Keep an eye on the status below!</p>
        </div>
        <div id="emscripten-status-message" class="status-message-bar">
            Loading LEGO® Island... please wait! <code>0%</code>
        </div>
    </div>
    <canvas id="canvas" oncontextmenu={(e) => e.preventDefault()} tabindex="-1"></canvas>
</div>
