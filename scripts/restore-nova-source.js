#!/usr/bin/env node
/** Restore the user's two exact NOVA reference PNGs (as a ZIP) from Git. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {readNovaParts} from '../nova-official-installer.js';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const sourceSha='23f9fe676e9eabed1cdf9122dcf5ff38e49afc3b66bae4f265662e9bc15debf7';
const bytes=readNovaParts(root,{
 subdir:'source',prefix:'NOVA_official_source_v0.2.zip.part',expectedSha256:sourceSha
});
if(!bytes)throw Error('NOVA official original artwork chunks are absent from this Git checkout');
const output=path.join(root,'art','nova-official','NOVA_official_source_v0.2.zip');
fs.writeFileSync(output,bytes);
console.log('Original art archived:',output);
console.log('ZIP SHA256:',crypto.createHash('sha256').update(bytes).digest('hex'));
console.log('Contains exactly the two unchanged official reference PNGs supplied by the project owner.');
console.log('Unzip locally to obtain official_chibi_original.png and official_mature_original.png');
