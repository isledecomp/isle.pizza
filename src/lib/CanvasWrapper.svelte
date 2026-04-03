<script>
    // Canvas wrapper for the Emscripten game
</script>

<div id="canvas-wrapper">
    <div id="loading-gif-overlay">
        <img src="images/cdspin.gif" alt="Loading game...">
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

<style>
.quote-block {
    max-width: 80%;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
}

.quote-block .quote-text {
    font-size: 0.5rem;
    color: var(--color-text-light);
    margin-bottom: 10px;
    font-style: italic;
    line-height: 1.4;
}

.quote-block .quote-attribution {
    font-size: 0.4rem;
    color: var(--color-text-medium);
    text-align: right;
}

.loading-info-text {
    margin-top: 15px;
    padding: 10px 15px;
    max-width: 280px;
    width: 80%;
    font-size: 0.8em;
    color: #b0b0b0;
    line-height: 1.5;
    text-align: center;
    border-top: 1px dashed var(--color-border-medium);
    padding-top: 15px;
}

.loading-info-text p {
    margin: 0 0 8px 0;
}

.loading-info-text p:last-child {
    margin-bottom: 0;
}

.status-message-bar {
    margin-top: 20px;
    padding: 8px 12px;
    width: 85%;
    max-width: 340px;
    background-color: var(--color-bg-input);
    color: var(--color-text-medium);
    font-family: 'Consolas', 'Menlo', 'Courier New', Courier, monospace;
    font-size: 0.75em;
    border-radius: 4px;
    text-align: center;
    line-height: 1.4;
    border: 1px solid #303030;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.status-message-bar :global(code) {
    color: var(--color-primary);
    background-color: var(--color-bg-panel);
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: bold;
}

@media (max-width: 768px) {
    .loading-info-text {
        max-width: 90%;
        font-size: 0.75em;
    }
}

@media (max-width: 480px) {
    .loading-info-text {
        max-width: 95%;
        font-size: 0.7em;
        margin-top: 10px;
        padding-top: 10px;
    }
}
</style>
