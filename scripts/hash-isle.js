import { createHash } from 'crypto';
import { readFileSync, writeFileSync, unlinkSync } from 'fs';

const dist = new URL('../dist/', import.meta.url);
const file = (name) => new URL(name, dist);
const hash = (data) => createHash('sha256').update(data).digest('hex').slice(0, 12);

function replaceOnce(text, search, replacement, name) {
    const parts = text.split(search);
    if (parts.length !== 2) {
        throw new Error(`Expected exactly one ${search} in ${name}, found ${parts.length - 1}`);
    }
    return parts.join(replacement);
}

const wasm = readFileSync(file('isle.wasm'));
const wasmName = `isle.${hash(wasm)}.wasm`;
writeFileSync(file(wasmName), wasm);
unlinkSync(file('isle.wasm'));

const js = replaceOnce(readFileSync(file('isle.js'), 'utf8'), '"isle.wasm"', JSON.stringify(wasmName), 'isle.js');
const jsName = `isle.${hash(js)}.js`;
writeFileSync(file(jsName), js);
unlinkSync(file('isle.js'));

const html = replaceOnce(readFileSync(file('index.html'), 'utf8'), 'src="/isle.js"', `src="/${jsName}"`, 'index.html');
writeFileSync(file('index.html'), html);

console.log(`Hashed game files: ${jsName}, ${wasmName}`);
