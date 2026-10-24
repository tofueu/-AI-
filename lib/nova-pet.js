import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const NOVA_STATES = ['IDLE', 'LISTENING', 'THINKING', 'RESPONDING', 'COMPLETED', 'ERROR'];

export class NovaPetEngine {
  constructor({ character = 'nova-default', costume = 'default', position = { x: 100, y: 100 } } = {}) {
    this.character = character;
    this.costume = costume;
    this.position = position;
    this.state = 'IDLE';
    this.visible = true;
    this.modManifest = null;
  }

  setState(newState) {
    if (!NOVA_STATES.includes(newState)) {
      throw new Error(`Invalid NOVA state: ${newState}`);
    }
    this.state = newState;
    return this.state;
  }

  loadModManifest(filepath) {
    if (!existsSync(filepath)) {
      throw new Error(`MOD manifest file not found: ${filepath}`);
    }
    const data = JSON.parse(readFileSync(filepath, 'utf8'));
    if (!data.name || !data.version || !data.layers) {
      throw new Error('Invalid MOD manifest structure');
    }
    this.modManifest = data;
    return this.modManifest;
  }

  getRenderState() {
    return {
      character: this.character,
      costume: this.costume,
      state: this.state,
      visible: this.visible,
      position: this.position,
      hasMod: !!this.modManifest
    };
  }
}
