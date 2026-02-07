module.exports = {
    globDirectory: 'dist/',
    globPatterns: [
        '**/*.{js,css,html,webp,wasm,pdf,mp3,gif,png,svg,json,tex}'
    ],
    swSrc: 'src-sw/sw.js',
    swDest: 'dist/sw.js',
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
};
