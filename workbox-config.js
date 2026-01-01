module.exports = {
    globDirectory: './',
    globPatterns: [
        'index.html', 'cancel_off.webp', 'cancel_on.webp', 'cdspin.gif',
        'configure_off.webp', 'configure_on.webp', 'favicon.png', 'favicon.svg',
        'free_stuff_off.webp', 'free_stuff_on.webp', 'install_off.webp', 'install_on.webp',
        'island.webp', 'isle.js', 'isle.wasm', 'poster.pdf', 'read_me_off.webp',
        'read_me_on.webp', 'run_game_off.webp', 'run_game_on.webp', 'shark.webp',
        'uninstall_off.webp', 'uninstall_on.webp', 'app.js', 'style.css', 'manifest.json',
        'install.webp', 'install.mp3', 'downloader.js', 'debug.js', 'debug.html', 'ogel.webp'
    ],
    swSrc: 'src/sw.js',
    swDest: 'sw.js',
    maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
};