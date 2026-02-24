/**
 * SVG-based charts for @react-pdf/renderer
 * All charts use native SVG primitives (Path, Rect, Circle) so they render
 * directly inside PDF documents without any external chart library.
 */
import { Svg, Path, Rect, Circle } from '@react-pdf/renderer';
import { View, Text } from '@react-pdf/renderer';
import { colors } from '../styles';

// ─── Geometry helpers ────────────────────────────────────────────

function pol(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

function arcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startDeg: number, endDeg: number,
): string {
  const sweep = Math.min(endDeg - startDeg, 359.99);
  const actualEnd = startDeg + sweep;
  const large = sweep > 180 ? 1 : 0;
  const os = pol(cx, cy, outerR, startDeg);
  const oe = pol(cx, cy, outerR, actualEnd);
  const is_ = pol(cx, cy, innerR, startDeg);
  const ie = pol(cx, cy, innerR, actualEnd);
  return [
    `M ${os.x} ${os.y}`,
    `A ${outerR} ${outerR} 0 ${large} 1 ${oe.x} ${oe.y}`,
    `L ${ie.x} ${ie.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${is_.x} ${is_.y}`,
    'Z',
  ].join(' ');
}

// ─── 1. DONUT CHART ─────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  /** Outer diameter in pts (default 100) */
  size?: number;
  /** Center label, e.g. total count */
  centerLabel?: string;
  centerSub?: string;
}

export function DonutChart({
  segments,
  size = 100,
  centerLabel,
  centerSub,
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.6;
  const gap = 1.5; // degrees gap between segments

  let currentAngle = 0;
  const paths: Array<{ d: string; fill: string }> = [];

  segments.forEach((seg) => {
    if (seg.value <= 0) return;
    const sweep = (seg.value / total) * 360;
    const start = currentAngle + gap / 2;
    const end = currentAngle + sweep - gap / 2;
    if (end > start) {
      paths.push({ d: arcPath(cx, cy, outerR, innerR, start, end), fill: seg.color });
    }
    currentAngle += sweep;
  });

  return (
    <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
      <View style={{ width: size, height: size }}>
        <Svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }}>
          {/* Background ring */}
          <Circle cx={cx} cy={cy} r={outerR} fill="#f3f4f6" />
          <Circle cx={cx} cy={cy} r={innerR} fill="#ffffff" />
          {/* Segments */}
          {paths.map((p, i) => (
            <Path key={i} d={p.d} fill={p.fill} />
          ))}
        </Svg>
        {/* Center text overlay */}
        {centerLabel && (
          <View style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <Text style={{ fontSize: 16, fontWeight: 700, color: colors.gray800, textAlign: 'center' }}>
              {centerLabel}
            </Text>
            {centerSub && (
              <Text style={{ fontSize: 7, color: colors.gray500, textAlign: 'center' }}>
                {centerSub}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={{ gap: 4 }}>
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: seg.color }} />
            <Text style={{ fontSize: 9, color: colors.gray700, textAlign: 'right' }}>
              {seg.label}
            </Text>
            <Text style={{ fontSize: 9, fontWeight: 700, color: seg.color }}>
              {seg.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── 2. GAUGE CHART (semi-circle) ───────────────────────────────

interface GaugeChartProps {
  /** 0–100 */
  value: number;
  label?: string;
  size?: number;
  color?: string;
}

export function GaugeChart({ value, label, size = 110, color }: GaugeChartProps) {
  const cx = size / 2;
  const cy = size / 2 + 4;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.65;
  const clamp = Math.max(0, Math.min(100, value));

  const gaugeColor = color || (clamp >= 70 ? colors.success : clamp >= 40 ? colors.warning : colors.danger);

  // Background arc: 180° to 360° (bottom half, left to right)
  const bgStart = 180;
  const bgEnd = 360;
  // Value arc
  const valEnd = 180 + (clamp / 100) * 180;

  return (
    <View style={{ width: size, height: size * 0.6, alignItems: 'center' }}>
      <Svg viewBox={`0 0 ${size} ${size * 0.6 + 4}`} style={{ width: size, height: size * 0.6 + 4 }}>
        {/* Background */}
        <Path d={arcPath(cx, cy, outerR, innerR, bgStart, bgEnd)} fill="#e5e7eb" />
        {/* Value */}
        {clamp > 0 && (
          <Path d={arcPath(cx, cy, outerR, innerR, bgStart, valEnd)} fill={gaugeColor} />
        )}
        {/* End dots */}
        <Circle cx={pol(cx, cy, (outerR + innerR) / 2, bgStart).x} cy={pol(cx, cy, (outerR + innerR) / 2, bgStart).y} r={2} fill="#d1d5db" />
        <Circle cx={pol(cx, cy, (outerR + innerR) / 2, bgEnd).x} cy={pol(cx, cy, (outerR + innerR) / 2, bgEnd).y} r={2} fill="#d1d5db" />
      </Svg>
      {/* Value text */}
      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center' }}>
        <Text style={{ fontSize: 20, fontWeight: 700, color: gaugeColor, textAlign: 'center' }}>
          {clamp}%
        </Text>
        {label && (
          <Text style={{ fontSize: 8, color: colors.gray500, textAlign: 'center' }}>
            {label}
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── 3. HORIZONTAL BAR CHART ────────────────────────────────────

interface HBarItem {
  label: string;
  value: number;
  color?: string;
}

interface HBarChartProps {
  bars: HBarItem[];
  /** Width of the chart area in pts (default 300) */
  width?: number;
  /** Max value override; defaults to largest value */
  maxValue?: number;
  /** Show value number next to bar */
  showValues?: boolean;
}

export function HorizontalBarChart({
  bars,
  width = 300,
  maxValue,
  showValues = true,
}: HBarChartProps) {
  if (!bars.length) return null;
  const max = maxValue || Math.max(...bars.map(b => b.value), 1);
  const barH = 14;
  const gap = 6;
  const labelW = 85;
  const valueW = showValues ? 30 : 0;
  const barAreaW = width - labelW - valueW - 8;

  const defaultColors = [colors.primary, colors.success, colors.warning, colors.danger, '#8b5cf6', '#06b6d4'];

  return (
    <View style={{ width }}>
      {bars.map((bar, i) => {
        const barColor = bar.color || defaultColors[i % defaultColors.length];
        const barW = Math.max(2, (bar.value / max) * barAreaW);

        return (
          <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', marginBottom: gap }}>
            <Text style={{
              width: labelW,
              fontSize: 8,
              color: colors.gray700,
              textAlign: 'right',
              paddingLeft: 4,
            }}>
              {bar.label}
            </Text>
            <View style={{ width: barAreaW, height: barH }}>
              <Svg viewBox={`0 0 ${barAreaW} ${barH}`} style={{ width: barAreaW, height: barH }}>
                {/* Background */}
                <Rect x={0} y={2} width={barAreaW} height={barH - 4} rx={3} fill="#f3f4f6" />
                {/* Value */}
                <Rect x={0} y={2} width={barW} height={barH - 4} rx={3} fill={barColor} />
              </Svg>
            </View>
            {showValues && (
              <Text style={{
                width: valueW,
                fontSize: 8,
                fontWeight: 700,
                color: barColor,
                textAlign: 'left',
                paddingRight: 4,
              }}>
                {bar.value}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── 4. PRICE RANGE CHART ───────────────────────────────────────

interface PriceRangeChartProps {
  min: number;
  max: number;
  recommended: number;
  width?: number;
}

export function PriceRangeChart({ min, max, recommended, width = 320 }: PriceRangeChartProps) {
  if (!max || max <= min) return null;

  const padL = 10;
  const padR = 10;
  const barW = width - padL - padR;
  const barH = 20;
  const svgH = 50;
  const barY = 8;

  const range = max - min || 1;
  const recX = padL + ((recommended - min) / range) * barW;

  return (
    <View style={{ width, marginVertical: 8 }}>
      <Svg viewBox={`0 0 ${width} ${svgH}`} style={{ width, height: svgH }}>
        {/* Bar background */}
        <Rect x={padL} y={barY} width={barW} height={barH} rx={4} fill="#e5e7eb" />
        {/* Green zone (min to mid) */}
        <Rect x={padL} y={barY} width={barW * 0.4} height={barH} rx={4} fill={`${colors.success}40`} />
        {/* Blue zone (mid) */}
        <Rect x={padL + barW * 0.35} y={barY} width={barW * 0.3} height={barH} rx={0} fill={`${colors.primary}35`} />
        {/* Orange zone (to max) */}
        <Rect x={padL + barW * 0.6} y={barY} width={barW * 0.4} height={barH} rx={4} fill={`${colors.warning}30`} />

        {/* Recommended marker line */}
        <Rect x={recX - 1.5} y={barY - 4} width={3} height={barH + 8} rx={1.5} fill={colors.primary} />
        {/* Recommended diamond */}
        <Path
          d={`M ${recX} ${barY - 7} L ${recX + 5} ${barY - 2} L ${recX} ${barY + 3} L ${recX - 5} ${barY - 2} Z`}
          fill={colors.primary}
        />

        {/* Min dot */}
        <Circle cx={padL + 4} cy={barY + barH / 2} r={3} fill={colors.success} />
        {/* Max dot */}
        <Circle cx={padL + barW - 4} cy={barY + barH / 2} r={3} fill={colors.warning} />
      </Svg>

      {/* Labels below */}
      <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: padL }}>
        <View>
          <Text style={{ fontSize: 7, color: colors.gray500, textAlign: 'right' }}>מינימום</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.success, textAlign: 'right' }}>
            {formatNum(min)}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 7, color: colors.gray500, textAlign: 'center' }}>מומלץ</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.primary, textAlign: 'center' }}>
            {formatNum(recommended)}
          </Text>
        </View>
        <View>
          <Text style={{ fontSize: 7, color: colors.gray500, textAlign: 'left' }}>מקסימום</Text>
          <Text style={{ fontSize: 9, fontWeight: 700, color: colors.warning, textAlign: 'left' }}>
            {formatNum(max)}
          </Text>
        </View>
      </View>
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return n?.toLocaleString('he-IL') || '0';
}

// ─── 5. STACKED STATUS BAR ─────────────────────────────────────

interface StackedBarProps {
  segments: Array<{ value: number; color: string; label: string }>;
  width?: number;
  height?: number;
}

export function StackedStatusBar({ segments, width = 320, height = 18 }: StackedBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return null;

  let x = 0;
  const rects: Array<{ x: number; w: number; color: string }> = [];
  segments.forEach((seg) => {
    if (seg.value <= 0) return;
    const w = (seg.value / total) * width;
    rects.push({ x, w, color: seg.color });
    x += w;
  });

  return (
    <View style={{ marginVertical: 4 }}>
      <View style={{ width, height, borderRadius: 4, overflow: 'hidden' }}>
        <Svg viewBox={`0 0 ${width} ${height}`} style={{ width, height }}>
          {rects.map((r, i) => (
            <Rect key={i} x={r.x} y={0} width={r.w} height={height} fill={r.color} />
          ))}
        </Svg>
      </View>
      {/* Legend row */}
      <View style={{ flexDirection: 'row-reverse', gap: 10, marginTop: 4 }}>
        {segments.filter(s => s.value > 0).map((seg, i) => (
          <View key={i} style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: seg.color }} />
            <Text style={{ fontSize: 7, color: colors.gray600 }}>{seg.label} ({seg.value})</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
