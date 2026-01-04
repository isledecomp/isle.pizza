importScripts('/workbox/workbox-sw.js');

workbox.setConfig({
    modulePathPrefix: '/workbox/'
});

const { precacheAndRoute, cleanupOutdatedCaches } = workbox.precaching;
const { registerRoute } = workbox.routing;
const { Strategy } = workbox.strategies;
const { CacheableResponsePlugin } = workbox.cacheableResponse;
const { RangeRequestsPlugin } = workbox.rangeRequests;

precacheAndRoute([{"revision":"16bf20c984837241c7887e9a83b4f138","url":"index.html"},{"revision":"013ceb7d67293d532e979dde0347f3af","url":"cancel_off.webp"},{"revision":"bfc1563be018d82685716c6130529129","url":"cancel_on.webp"},{"revision":"d282c260fd35522036936bb6faf8ad21","url":"cdspin.gif"},{"revision":"3d820bf72b19bd4e437a61e75f317b83","url":"configure_off.webp"},{"revision":"e2c0c5e6aa1f7703c385a433a2d2a519","url":"configure_on.webp"},{"revision":"88e1e81c930d8e6c24dfdc7af274e812","url":"favicon.png"},{"revision":"d16b293eca457e2fb1e7ef2caca8c904","url":"favicon.svg"},{"revision":"d2b9c2e128ef1e5e4265c603b0bc3305","url":"free_stuff_off.webp"},{"revision":"cbc6a6779897f932c3a3c8dceb329804","url":"free_stuff_on.webp"},{"revision":"05fba4ef1884cbbd6afe09ea3325efc0","url":"install_off.webp"},{"revision":"11247e92082ba3d978a2e3785b0acf51","url":"install_on.webp"},{"revision":"d23ea8243c18eb217ef08fe607097824","url":"island.webp"},{"revision":"c97d78e159b8bff44d41e56d0aa20220","url":"isle.js"},{"revision":"5f174d45de1e3c5e0abdbccfd64567b6","url":"isle.wasm"},{"revision":"6d4248f1a08c218943e582673179b7be","url":"poster.pdf"},{"revision":"a6fcac24a24996545c039a1755af33ea","url":"read_me_off.webp"},{"revision":"aae783d064996b4322e23b092d97ea4a","url":"read_me_on.webp"},{"revision":"766a9e6e6d890f24cef252e81753b29d","url":"run_game_off.webp"},{"revision":"70208e00e9ea641e4c98699f74100db3","url":"run_game_on.webp"},{"revision":"0a65c71d9983c9bb1bc6a5f405fd6fd9","url":"shark.webp"},{"revision":"88c1fd032e6fc16814690712a26c1ede","url":"uninstall_off.webp"},{"revision":"0118a4aca04c5fb0a525bf00b001844e","url":"uninstall_on.webp"},{"revision":"943bf59ca9322a9c8f52de414c15be1c","url":"app.js"},{"revision":"648639355c3b7ae7ee6aeeda619466ee","url":"style.css"},{"revision":"060210979e13e305510de6285e085db1","url":"manifest.json"},{"revision":"4f0172bc7007d34cebf681cc233ab57f","url":"install.webp"},{"revision":"6a70d35dadf51d2ec6e38a6202d7fb0b","url":"install.mp3"},{"revision":"eac041a0b8835bfea706d997b0b7b224","url":"downloader.js"},{"revision":"6899f72755d4e84c707b93ac54a8fb06","url":"debug.js"},{"revision":"7817b36ddda9f07797c05a0ff6cacb21","url":"debug.html"},{"revision":"4ea2aac9446188b8a588811bc593919e","url":"ogel.webp"},{"revision":"c57d24598537443c5b8276c8dd5dbdc9","url":"bonus.webp"},{"revision":"d11c8c893d5525c8842555dc2861c393","url":"callfail.webp"},{"revision":"be9a89fb567b632cf8d4661cbf8afd9e","url":"getinfo.webp"},{"revision":"fe986681f41e96631f39f3288b23e538","url":"sysinfo.webp"},{"revision":"4ec902e0b0ce60ffd9dd565c9ddf40a1","url":"send.webp"},{"revision":"81f3c8fc38b876dc2fcfeefaadad1d1b","url":"congrats.webp"},{"revision":"f906318cb87e09a819e5916676caab2e","url":"register.webp"},{"revision":"c633a7500e6f30162bf1cf4ec4e95a6d","url":"later.webp"},{"revision":"d149d5709ac00fd5e2967ab4f3d74886","url":"comic.pdf"}]);

const gameFiles = [
    "/LEGO/Scripts/CREDITS.SI", "/LEGO/Scripts/INTRO.SI", "/LEGO/Scripts/NOCD.SI", "/LEGO/Scripts/SNDANIM.SI",
    "/LEGO/Scripts/Act2/ACT2MAIN.SI", "/LEGO/Scripts/Act3/ACT3.SI", "/LEGO/Scripts/Build/COPTER.SI",
    "/LEGO/Scripts/Build/DUNECAR.SI", "/LEGO/Scripts/Build/JETSKI.SI", "/LEGO/Scripts/Build/RACECAR.SI",
    "/LEGO/Scripts/Garage/GARAGE.SI", "/LEGO/Scripts/Hospital/HOSPITAL.SI", "/LEGO/Scripts/Infocntr/ELEVBOTT.SI",
    "/LEGO/Scripts/Infocntr/HISTBOOK.SI", "/LEGO/Scripts/Infocntr/INFODOOR.SI", "/LEGO/Scripts/Infocntr/INFOMAIN.SI",
    "/LEGO/Scripts/Infocntr/INFOSCOR.SI", "/LEGO/Scripts/Infocntr/REGBOOK.SI", "/LEGO/Scripts/Isle/ISLE.SI",
    "/LEGO/Scripts/Isle/JUKEBOX.SI", "/LEGO/Scripts/Isle/JUKEBOXW.SI", "/LEGO/Scripts/Police/POLICE.SI",
    "/LEGO/Scripts/Race/CARRACE.SI", "/LEGO/Scripts/Race/CARRACER.SI", "/LEGO/Scripts/Race/JETRACE.SI",
    "/LEGO/Scripts/Race/JETRACER.SI", "/LEGO/data/WORLD.WDB"
];

const textureFiles = [
    "/LEGO/textures/beach.gif.bmp", "/LEGO/textures/doctor.gif.bmp", "/LEGO/textures/infochst.gif.bmp",
    "/LEGO/textures/o.gif.bmp", "/LEGO/textures/relrel01.gif.bmp", "/LEGO/textures/rockx.gif.bmp",
    "/LEGO/textures/water2x.gif.bmp", "/LEGO/textures/bowtie.gif.bmp", "/LEGO/textures/e.gif.bmp",
    "/LEGO/textures/jfrnt.gif.bmp", "/LEGO/textures/papachst.gif.bmp", "/LEGO/textures/road1way.gif.bmp",
    "/LEGO/textures/sandredx.gif.bmp", "/LEGO/textures/w_curve.gif.bmp", "/LEGO/textures/brela_01.gif.bmp",
    "/LEGO/textures/flowers.gif.bmp", "/LEGO/textures/l6.gif.bmp", "/LEGO/textures/pebblesx.gif.bmp",
    "/LEGO/textures/road3wa2.gif.bmp", "/LEGO/textures/se_curve.gif.bmp", "/LEGO/textures/wnbars.gif.bmp",
    "/LEGO/textures/bth1chst.gif.bmp", "/LEGO/textures/fruit.gif.bmp", "/LEGO/textures/l.gif.bmp",
    "/LEGO/textures/pizcurve.gif.bmp", "/LEGO/textures/road3wa3.gif.bmp", "/LEGO/textures/shftchst.gif.bmp",
    "/LEGO/textures/bth2chst.gif.bmp", "/LEGO/textures/gasroad.gif.bmp", "/LEGO/textures/mamachst.gif.bmp",
    "/LEGO/textures/polbar01.gif.bmp", "/LEGO/textures/road3way.gif.bmp", "/LEGO/textures/tightcrv.gif.bmp",
    "/LEGO/textures/cheker01.gif.bmp", "/LEGO/textures/g.gif.bmp", "/LEGO/textures/mech.gif.bmp",
    "/LEGO/textures/polkadot.gif.bmp", "/LEGO/textures/road4way.gif.bmp", "/LEGO/textures/unkchst.gif.bmp",
    "/LEGO/textures/construct.gif.bmp", "/LEGO/textures/grassx.gif.bmp", "/LEGO/textures/nwcurve.gif.bmp",
    "/LEGO/textures/redskul.gif.bmp", "/LEGO/textures/roadstr8.gif.bmp", "/LEGO/textures/vest.gif.bmp"
];

const rangeRequestsPlugin = new RangeRequestsPlugin();
const normalizePathPlugin = {
    cacheKeyWillBeUsed: async ({ request }) => {
        const url = new URL(request.url);
        const normalizedPath = url.pathname.replace(/\/{2,}/g, '/');
        const normalizedUrl = url.origin + normalizedPath;
        if (request.url === normalizedUrl) {
            return request;
        }
        return new Request(normalizedUrl, {
            headers: request.headers, method: request.method,
            credentials: request.credentials, redirect: request.redirect,
            referrer: request.referrer, body: request.body,
        });
    },
};

class LegoCacheStrategy extends Strategy {
    async _handle(request, handler) {
        const cacheKeyRequest = await normalizePathPlugin.cacheKeyWillBeUsed({ request });
        const cachedResponse = await caches.match(cacheKeyRequest);

        if (cachedResponse) {
            return await rangeRequestsPlugin.cachedResponseWillBeUsed({
                request: cacheKeyRequest,
                cachedResponse: cachedResponse,
            });
        }

        return handler.fetch(request);
    }
}

const getLanguageCacheName = (language) => `game-assets-${language}`;

async function uninstallLanguagePack(language, client) {
    const cacheName = getLanguageCacheName(language);
    try {
        const deleted = await caches.delete(cacheName);
        if (deleted) {
            console.log(`Cache ${cacheName} deleted successfully.`);
        }
        client.postMessage({ action: 'uninstall_complete', success: deleted, language: language });
    } catch (error) {
        console.error('Error during language pack uninstallation:', error);
        client.postMessage({ action: 'uninstall_complete', success: false, language: language, error: error.message });
    }
}

async function checkCacheStatus(language, hdTextures, siFiles, client) {
    const cacheName = getLanguageCacheName(language);
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    const cachedUrls = requests.map(req => new URL(req.url).pathname);
    let requiredFiles = gameFiles;
    if (hdTextures) {
        requiredFiles = requiredFiles.concat(textureFiles);
    }
    if (siFiles.length > 0) {
        requiredFiles = requiredFiles.concat(siFiles);
    }
    const missingFiles = requiredFiles.filter(file => !cachedUrls.includes(file));

    client.postMessage({
        action: 'cache_status',
        isInstalled: missingFiles.length === 0,
        missingFiles: missingFiles,
        language: language
    });
}

registerRoute(
    ({ url }) => url.pathname.startsWith('/LEGO/'),
    new LegoCacheStrategy()
);

self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    cleanupOutdatedCaches();
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.action) {
        switch (event.data.action) {
            case 'uninstall_language_pack':
                uninstallLanguagePack(event.data.language, event.source);
                break;
            case 'check_cache_status':
                checkCacheStatus(event.data.language, event.data.hdTextures, event.data.siFiles, event.source);
                break;
        }
    }
});
