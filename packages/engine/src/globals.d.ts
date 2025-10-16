/**
 * Global type declarations for headless engine
 * Provides minimal browser API types without DOM dependency
 */

// Timer functions
declare function setTimeout(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function clearTimeout(id: number): void;
declare function setInterval(handler: TimerHandler, timeout?: number, ...arguments: any[]): number;
declare function clearInterval(id: number): void;

type TimerHandler = (...args: any[]) => void;

// Web Audio API types (minimal)
declare class AudioBuffer {
  readonly length: number;
  readonly duration: number;
  readonly sampleRate: number;
  readonly numberOfChannels: number;
  getChannelData(channel: number): Float32Array;
  copyFromChannel(destination: Float32Array, channelNumber: number, bufferOffset?: number): void;
  copyToChannel(source: Float32Array, channelNumber: number, bufferOffset?: number): void;
}

// Console API
declare namespace globalThis {
  var console: Console;
  var LL_DEBUG_REVERSE_REVERB: boolean | undefined;
  var LL_DEBUG_WIDTH: boolean | undefined;
  var LL_DEBUG_AUDIO: boolean | undefined;
  var LL_DEBUG_IR: boolean | undefined;
  var CustomEvent: any;
  function dispatchEvent(event: any): boolean;
}

interface Console {
  log(...data: any[]): void;
  error(...data: any[]): void;
  warn(...data: any[]): void;
  info(...data: any[]): void;
}
