// MPC Pad Management - Types and Utilities

export type MPCPadConnection = {
  instrumentId: string;  // source instrument
};

export type MPCPad = {
  id: `pad-${number}`;
  padNumber: number;  // 1..8
  connection: MPCPadConnection | null;
  color: string;      // pad color (from instrument or gray)
  label: string;      // "PAD N" or "PAD N • KEYS"
  muted: boolean;
  solo: boolean;
  loop: {
    steps: boolean[];
    playheadIndex: number;
  };
};

/**
 * Initialize 8 empty MPC pads
 */
export function initialEightPads(): MPCPad[] {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `pad-${i + 1}` as `pad-${number}`,
    padNumber: i + 1,
    connection: null,
    color: 'hsl(var(--muted))',  // gray when empty
    label: `PAD ${i + 1}`,
    muted: false,
    solo: false,
    loop: {
      steps: Array(16).fill(false),
      playheadIndex: -1
    },
  }));
}

/**
 * Connect instrument to pad
 */
export function connectPad(
  pad: MPCPad,
  instrumentKind: 'keys' | 'bass' | 'drums',
  instrumentId: string,
  instrumentColor: string
): MPCPad {
  return {
    ...pad,
    connection: { instrumentId },
    color: instrumentColor,
    label: `PAD ${pad.padNumber} • ${instrumentKind.toUpperCase()}`,
  };
}

/**
 * Disconnect pad (keeps loop data)
 */
export function disconnectPad(pad: MPCPad): MPCPad {
  return {
    ...pad,
    connection: null,
    color: 'hsl(var(--muted))',
    label: `PAD ${pad.padNumber}`,
    // loop data persists when disconnected
  };
}

/**
 * Check if pad is empty (no connection)
 */
export function isPadEmpty(pad: MPCPad): boolean {
  return pad.connection === null;
}
