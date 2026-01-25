import App from './App.svelte';
import { mount } from 'svelte';
import './app.css';

// Global Module object required by Emscripten - must be defined before isle.js loads
window.Module = {
    arguments: ['--ini', '/config/isle.ini'],
    running: false,
    preRun: function () {
        window.Module["addRunDependency"]("isle");
        window.Module.running = true;
    },
    canvas: null, // Will be set after mount
    onExit: function () {
        window.location.reload();
    }
};

// Mount Svelte app
const app = mount(App, {
    target: document.getElementById('app')
});

// Set canvas reference after mount
window.Module.canvas = document.getElementById('canvas');

export default app;
