self.onmessage = async (event) => {
    const { action, missingFiles, language } = event.data;

    if (action === 'install') {
        const cacheName = `game-assets-${language}`;
        const THROTTLE_MS = 100;

        try {
            const totalFiles = missingFiles.length;
            let filesDownloaded = 0;
            let lastProgressUpdate = 0;

            const cache = await caches.open(cacheName);

            for (const fileUrl of missingFiles) {
                const request = new Request(fileUrl, { headers: { 'Accept-Language': language } });
                const response = await fetch(request);

                if (!response.ok || !response.body) {
                    throw new Error(`Failed to fetch ${fileUrl}`);
                }

                const fileSize = Number(response.headers.get('content-length')) || 0;
                let fileBytesRead = 0;

                const [streamForCaching, streamForProgress] = response.body.tee();
                const cachePromise = cache.put(request, new Response(streamForCaching, response));

                const reader = streamForProgress.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    fileBytesRead += value.length;
                    const now = Date.now();

                    if (now - lastProgressUpdate > THROTTLE_MS) {
                        lastProgressUpdate = now;
                        const fileProgress = fileSize > 0 ? fileBytesRead / fileSize : 0;
                        const progress = ((filesDownloaded + fileProgress) / totalFiles) * 100;
                        self.postMessage({ action: 'install_progress', progress });
                    }
                }
                await cachePromise;
                filesDownloaded++;
            }

            self.postMessage({ action: 'install_complete', success: true });
        } catch (error) {
            console.error("Download worker error:", error);
            self.postMessage({ action: 'install_failed', error: error.message });
        }
    }
};
