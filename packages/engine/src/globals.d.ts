/**
 * Global type declarations for headless engine
 * ONLY headless-safe types - NO DOM APIs
 */

// Timer functions (Node.js compatible)
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): NodeJS.Timeout;
declare function clearTimeout(id: NodeJS.Timeout | number): void;
declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): NodeJS.Timeout;
declare function clearInterval(id: NodeJS.Timeout | number): void;

type TimerHandler = (...args: any[]) => void;

// Web Audio API types (minimal - NOT DOM-dependent)
declare class AudioBuffer {
  readonly length: number;
  readonly duration: number;
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void;
  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void;
}

// Console API (universal)
declare namespace globalThis {
  var console: Console;
  var LL_DEBUG_REVERSE_REVERB: boolean | undefined;
  var LL_DEBUG_WIDTH: boolean | undefined;
  var LL_DEBUG_AUDIO: boolean | undefined;
  var LL_DEBUG_IR: boolean | undefined;
  var LL_DEBUG_FX_BUSES: boolean | undefined;
  var LL_DEBUG_DUCK: boolean | undefined;
  var LL_DEBUG_GAIN_STAGING: boolean | undefined;
  var LL_DEBUG_PARAM_CURVES: boolean | undefined;
  var CustomEvent: any;
  function dispatchEvent(event: any): boolean;
}

interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
}

// Node.js types (for tests and build)
declare namespace NodeJS {
  interface Timeout {}
  interface ProcessEnv {
    NODE_ENV?: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};

declare var __dirname: string;

// Node.js module declarations (for tests)
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: string): string;
  export function existsSync(path: string): boolean;
}

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}
