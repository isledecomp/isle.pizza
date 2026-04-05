# [isle.pizza](https://isle.pizza) Frontend

A custom web frontend for the Emscripten port of [isle-portable](https://github.com/isledecomp/isle-portable), allowing LEGO Island to run directly in modern web browsers.

<img width="1209" height="792" alt="image" src="https://github.com/user-attachments/assets/b98f8fef-8f30-49be-b424-99c27ea552f3" />

## Requirements

- [Node.js](https://nodejs.org/) 20 or later

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/isledecomp/isle.pizza.git
   cd isle.pizza
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Obtain the game files (`isle.js` and `isle.wasm`) by building the Emscripten version of [isle-portable](https://github.com/isledecomp/isle-portable), then copy them to the project root.

4. Set up the LEGO Island game assets:
   ```bash
   npm run prepare:assets
   ```
   This will prompt you for the path to your LEGO Island installation or mounted ISO and create the necessary symlinks. You can also provide the path directly:
   ```bash
   npm run prepare:assets -- -p /path/to/your/LEGO
   ```

5. Generate the save editor asset bundle (requires game assets from step 4):
   ```bash
   npm run generate:save-editor-assets
   ```
   This extracts animations, sounds, textures, and character icons from the game files into `save-editor.bin`, used by the save editor's 3D previews.

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open the URL shown in the terminal (usually `http://localhost:5173`).

## Architecture

The project consists of three components:

| Component | Directory | Required | Description |
|-----------|-----------|----------|-------------|
| **Frontend** | Root | Yes | Svelte SPA served from Cloudflare R2 |
| **API Worker** | `server/` | No | Hono-based Cloudflare Worker handling auth, cloud sync, crash reports, and memories (backed by D1) |
| **Multiplayer Relay** | External | No | WebSocket relay for peer-to-peer multiplayer ([source](https://github.com/isledecomp/isle-portable/tree/master/extensions/src/multiplayer/server)) |
| **Share Worker** | `worker/` | No | Cloudflare Worker that injects Open Graph meta tags for `/memory/*` and `/scene/*` share URLs |

The frontend degrades gracefully without the optional components — single-player gameplay, the save editor, and the full UI all work without them.

## Backend Setup (Optional)

### API Worker

Optional. Enables authentication, cloud sync, crash reports, and memory features.

```bash
docker build -t isle-pizza-api -f server/Dockerfile . && docker run --rm -p 8788:8788 isle-pizza-api
```

The server starts on port 8788. To enable Discord authentication, create `server/.dev.vars` with:

```
BETTER_AUTH_SECRET=<random secret>
DISCORD_CLIENT_ID=<your Discord app client ID>
DISCORD_CLIENT_SECRET=<your Discord app client secret>
```

### Multiplayer Relay

Optional. Enables the multiplayer lobby and in-game networking. The relay server lives in the [isle-portable repository](https://github.com/isledecomp/isle-portable/tree/master/extensions/src/multiplayer/server).

From the isle-portable repo:
```bash
docker build -t isle-relay -f docker/relay/Dockerfile . && docker run --rm -p 8787:8787 isle-relay
```

## Environment Variables

### Build-time (frontend)

| Variable | Default | Description |
|----------|---------|-------------|
| `RELAY_URL` | `ws://localhost:8787` | Multiplayer relay WebSocket URL |
| `API_URL` | `http://localhost:8788` | Backend API URL |
| `BUILD_VERSION` | `null` | Version string injected into the build |

These are configured in `site.config.js` and injected via Vite's `define`.

### Runtime (API worker)

| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Encryption key for auth sessions |
| `DISCORD_CLIENT_ID` | Discord OAuth2 application ID |
| `DISCORD_CLIENT_SECRET` | Discord OAuth2 secret |

Set these in `server/.dev.vars` for local development.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (copies game files to `dist/`, injects service worker) |
| `npm run build:ci` | CI build (skips copying game files) |
| `npm run check` | Run svelte-check with warnings as errors |
| `npm run preview` | Preview the production build locally |
| `npm run prepare:assets` | Set up LEGO Island game assets via symlinks |
| `npm run generate:save-editor-assets` | Extract save editor assets into `save-editor.bin` |
| `npm run deploy` | Deploy to dev environment (R2) |
| `npm run deploy:assets` | Deploy to dev environment including game assets |
| `npm run deploy:prod` | Deploy to production environment (R2) |
| `npm run deploy:prod:assets` | Deploy to production including game assets |

## Project Structure

```
isle.pizza/
├── src/
│   ├── App.svelte         # Main application component
│   ├── app.css            # Global styles
│   ├── stores.js          # Svelte stores for state management
│   ├── core/
│   │   ├── formats/       # Binary file parsers/serializers (WDB, save games, animations, textures)
│   │   ├── rendering/     # OGL renderers (BaseRenderer, VehiclePartRenderer, ActorRenderer, etc.)
│   │   ├── savegame/      # Save game constants, actor data, color tables
│   │   └── ...            # Audio, OPFS, cloud sync, auth, service worker, asset loading
│   └── lib/               # UI components and pages (save editor, multiplayer, scene player, etc.)
├── server/                # API worker (Cloudflare Workers + D1)
│   ├── src/               # Hono routes: auth, memories, cloud sync, crash reports
│   ├── migrations/        # D1 database migrations
│   ├── Dockerfile         # Local development container
│   └── wrangler.toml      # Cloudflare Workers config
├── worker/                # Share/OG worker (Cloudflare Workers + R2)
│   ├── src/               # Open Graph tag injection for share URLs
│   └── wrangler.toml      # Cloudflare Workers config
├── scripts/               # Build, asset generation, and deploy scripts
├── src-sw/                # Service worker source (Workbox-based caching and offline support)
├── public/
│   └── images/            # UI images (menu buttons, tab icons)
├── site.config.js         # Build-time environment config (RELAY_URL, API_URL)
├── index.html             # HTML entry point
├── isle.js                # Emscripten JS (not in repo, build from isle-portable)
├── isle.wasm              # Emscripten WASM (not in repo, build from isle-portable)
├── save-editor.bin        # Packed save editor assets (not in repo, generated)
└── LEGO/                  # Game data directory (not in repo, symlinked)
```

## Building the Game Files

The `isle.js` and `isle.wasm` files are not included in this repository. To obtain them:

1. Follow the [isle-portable build instructions](https://github.com/isledecomp/isle-portable#building) for the Emscripten target
2. Copy the resulting `isle.js` and `isle.wasm` to this project's root directory

Alternatively, a [Docker image that bundles the runtime with this frontend](https://github.com/isledecomp/isle-portable/wiki/Installation#web-port-emscripten) is available.

## CI

The [build workflow](.github/workflows/build.yml) runs on pushes to `master` and on pull requests. It installs dependencies, runs `npm run check` (svelte-check), and builds with `npm run build:ci`. Deployment is done manually via the deploy scripts.

## Tech Stack

- [Svelte 5](https://svelte.dev/) - UI framework
- [OGL](https://github.com/oframe/ogl) - 3D rendering for save editor previews
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Workbox](https://developer.chrome.com/docs/workbox/) - Service worker and offline support
- [Hono](https://hono.dev/) - Backend API framework (Cloudflare Workers)
- [better-auth](https://www.better-auth.com/) - Authentication (Discord)
- [Cloudflare D1](https://developers.cloudflare.com/d1/) - Database for the API worker
- [Cloudflare R2](https://developers.cloudflare.com/r2/) - Static asset hosting and share worker storage

## License

See [LICENSE](LICENSE) for details.
