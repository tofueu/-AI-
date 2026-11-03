#!/usr/bin/env node
import {exportNovaBlankPngLayers} from './png-template.js';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

export function parseNovaTemplateArgs(args) {
  if (!Array.isArray(args) || args.length < 2 || args.length > 4) {
    throw new Error('Usage: node nova/export-template-cli.js <chibi|adult> <output-directory> [width] [height]');
  }
  const [variant,directory,widthText,heightText] = args;
  if (!['chibi','adult'].includes(variant)) throw new Error('Variant must be chibi or adult');
  if (typeof directory !== 'string' || !directory.trim()) throw new Error('Output directory required');
  const parseDimension = value => {
    if (!/^[0-9]+$/.test(value)) throw new Error('Dimensions must be positive integers');
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 64 || number > 4096) throw new Error('Dimensions must be 64..4096');
    return number;
  };
  const options = {};
  if (widthText !== undefined) options.width = parseDimension(widthText);
  if (heightText !== undefined) options.height = parseDimension(heightText);
  return {variant,directory,options};
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const {variant,directory,options} = parseNovaTemplateArgs(process.argv.slice(2));
    const manifest = await exportNovaBlankPngLayers(directory,variant,options);
    console.log(`Created ${manifest.layers.length} transparent PNG layers and manifest.json for ${variant} in ${directory}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
