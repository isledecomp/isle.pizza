self.onmessage = async (event) => {
    const { action, missingFiles, language } = event.data;

    if (action === 'install') {
        const cacheName = `game-assets-${language}`;
        const THROTTLE_MS = 100;

        try {
            const fileMetadataPromises = missingFiles.map(fileUrl =>
                fetch(fileUrl, { method: 'HEAD', headers: { 'Accept-Language': language } })
                    .then(response => {
                        if (!response.ok) throw new Error(`Failed to HEAD ${fileUrl}`);
                        return { url: fileUrl, size: Number(response.headers.get('content-length')) || 0 };
                    })
            );
            const fileMetadata = await Promise.all(fileMetadataPromises);
            const totalBytesToDownload = fileMetadata.reduce((sum, file) => sum + file.size, 0);
            let bytesDownloaded = 0;
            let lastProgressUpdate = 0;

            const cache = await caches.open(cacheName);

            for (const file of fileMetadata) {
                const request = new Request(file.url, { headers: { 'Accept-Language': language } });
                const response = await fetch(request);

                if (!response.ok || !response.body) {
                    throw new Error(`Failed to fetch ${file.url}`);
                }

                const [streamForCaching, streamForProgress] = response.body.tee();
                const cachePromise = cache.put(request, new Response(streamForCaching, response));

                const reader = streamForProgress.getReader();
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    bytesDownloaded += value.length;
                    const now = Date.now();

                    if (now - lastProgressUpdate > THROTTLE_MS) {
                        lastProgressUpdate = now;
                        self.postMessage({
                            action: 'install_progress',
                            progress: (bytesDownloaded / totalBytesToDownload) * 100,
                        });
                    }
                }
                await cachePromise;
            }

            self.postMessage({ action: 'install_complete', success: true });
        } catch (error) {
            console.error("Download worker error:", error);
            self.postMessage({ action: 'install_failed', error: error.message });
        }
    }
};
