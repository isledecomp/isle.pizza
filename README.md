# [isle.pizza](https://isle.pizza) Frontend

A custom web frontend for the Emscripten port of [isle-portable](https://github.com/isledecomp/isle-portable), allowing LEGO Island to run directly in modern web browsers.

<img width="1209" height="792" alt="image" src="https://github.com/user-attachments/assets/b98f8fef-8f30-49be-b424-99c27ea552f3" />

## Requirements

- [Node.js](https://nodejs.org/)

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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run prepare:assets` | Set up LEGO Island game assets via symlinks |
| `npm run generate:save-editor-assets` | Extract save editor assets (animations, sounds, textures, icons) into `save-editor.bin` |
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (outputs to `dist/`) |
| `npm run preview` | Preview the production build locally |

## Project Structure

```
isle.pizza/
├── src/
│   ├── App.svelte         # Main application component
│   ├── app.css            # Global styles
│   ├── stores.js          # Svelte stores for state management
│   ├── core/
│   │   ├── formats/       # Binary file parsers/serializers (WDB, save games, animations, textures)
│   │   ├── rendering/     # Three.js renderers (BaseRenderer, VehiclePartRenderer, ActorRenderer, etc.)
│   │   ├── savegame/      # Save game constants, actor data, color tables
│   │   └── ...            # Audio, OPFS, service worker, asset loading
│   └── lib/               # UI components and pages (save editor, configure, etc.)
├── public/
│   └── images/            # UI images (menu buttons, tab icons)
├── scripts/               # Build and asset generation scripts
├── src-sw/                # Service worker source
├── index.html             # HTML entry point
├── isle.js                # Emscripten JS (not in repo, build from isle-portable)
├── isle.wasm              # Emscripten WASM (not in repo, build from isle-portable)
├── save-editor.bin        # Packed save editor assets: animations, sounds, textures, icons (not in repo, generated)
└── LEGO/                  # Game data directory (not in repo)
```

## Building the Game Files

The `isle.js` and `isle.wasm` files are not included in this repository. To obtain them:

1. Follow the [isle-portable build instructions](https://github.com/isledecomp/isle-portable#building) for the Emscripten target
2. Copy the resulting `isle.js` and `isle.wasm` to this project's root directory

Alternatively, a [Docker image that bundles the runtime with this frontend](https://github.com/isledecomp/isle-portable/wiki/Installation#web-port-emscripten) is available.

## Tech Stack

- [Svelte 5](https://svelte.dev/) - UI framework
- [Three.js](https://threejs.org/) - 3D rendering for save editor previews
- [Vite](https://vitejs.dev/) - Build tool and dev server
- [Workbox](https://developer.chrome.com/docs/workbox/) - Service worker and offline support

## License

See [LICENSE](LICENSE) for details.
