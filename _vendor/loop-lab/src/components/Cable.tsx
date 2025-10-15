// ════════════════════════════════════════════════════════════════════════════
// Cable Component - Phase 2: Horizontal Bézier Curves + Fat Hit Targets
// ════════════════════════════════════════════════════════════════════════════

import { LTR } from '@/lib/ui-layout';

type Pt = { x: number; y: number };

interface CableProps {
  from: Pt | (() => Pt);
  to: Pt | (() => Pt);
  color?: string;
  width?: number;
  live?: boolean; // if true, can style as animated link
  className?: string;
  onClick?: () => void; // optional click handler for cable deletion
}

/**
 * Computes horizontal Bézier cubic path (left-to-right flow).
 * Control points pull horizontally instead of vertically.
 *
 * @param a - Starting point
 * @param b - Ending point
 * @returns SVG path string with horizontal control points
 */
function cubicPath(a: Pt, b: Pt): string {
  const dx = Math.max(Math.abs(b.x - a.x) * LTR.k, LTR.minPull);
  const c1 = { x: a.x + dx, y: a.y }; // Pull right from source
  const c2 = { x: b.x - dx, y: b.y }; // Pull left from target
  return `M ${a.x},${a.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${b.x},${b.y}`;
}

/**
 * Cable component with horizontal Bézier routing and clickable fat hit area.
 *
 * Features:
 * - Horizontal control points for left-to-right signal flow
 * - 16px invisible stroke for easy clicking
 * - Visible 3px stroke on top for visual clarity
 * - Hover effects for cable deletion
 */
export function Cable({
  from,
  to,
  color = '#00e0ff',
  width = 3,
  live,
  className,
  onClick,
}: CableProps) {
  // Coerce function getters or static points
  const f = typeof from === 'function' ? from() : from;
  const t = typeof to === 'function' ? to() : to;

  const d = cubicPath(f, t);

  return (
    <g>
      {/* Invisible fat hit area for easy clicking (16px) */}
      {onClick && (
        <path
          d={d}
          stroke="transparent"
          strokeWidth={16}
          fill="none"
          pointerEvents="all"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClick();
          }}
        />
      )}

      {/* Visible cable line */}
      <path
        d={d}
        stroke={color}
        strokeWidth={width}
        fill="none"
        pointerEvents="none"
        className={className || (live ? 'track-cable' : undefined)}
        style={{
          transition: 'stroke-width 0.2s, opacity 0.2s',
        }}
      />
    </g>
  );
}
