// Injects the workbox manifest into the service worker
// Config is loaded from workbox-config-vite.js for easy editing
import {injectManifest} from 'workbox-build';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const config = require('../workbox-config.cjs');

injectManifest(config).then(({count, size}) => {
  console.log(`Precached ${count} files, totaling ${size} bytes.`);
}).catch((err) => {
  console.error('Workbox injection failed:', err);
  process.exit(1);
});
