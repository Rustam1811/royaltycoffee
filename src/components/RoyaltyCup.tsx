import React, { useId } from 'react';
import { motion } from 'framer-motion';

interface RoyaltyCupProps {
  percent: number;
  size?: number;
  className?: string;
}

/* ── Steam wisp — thin candle-like thread rising & fading ── */
const SteamWisp = React.memo<{ d: number; x: number; sway?: number; uid: string }>(
  ({ d, x, sway = 6, uid }) => {
    // Each wisp is a thin path that rises, sways gently, thins out, and vanishes
    const dur = 3.6 + d * 0.4;
    return (
      <motion.g>
        {/* Main thread — thin, rises straight up with gentle S-curve */}
        <motion.path
          d={`M${x},0 Q${x - sway * 0.3},-25 ${x + sway * 0.5},-55 T${x - sway * 0.4},-95`}
          stroke="#FFFFFF"
          strokeWidth={1.8}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 0.5, 0.85, 1],
            opacity: [0, 0.45, 0.3, 0],
            strokeWidth: [1.8, 1.4, 0.8, 0.2],
          }}
          transition={{ duration: dur, delay: d, repeat: Infinity, ease: 'easeOut' }}
        />
        {/* Soft glow around thread */}
        <motion.path
          d={`M${x},0 Q${x - sway * 0.3},-25 ${x + sway * 0.5},-55 T${x - sway * 0.4},-95`}
          stroke={`url(#stm-${uid})`}
          strokeWidth={5}
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{
            pathLength: [0, 0.4, 0.7, 1],
            opacity: [0, 0.2, 0.12, 0],
            strokeWidth: [5, 4, 2.5, 1],
          }}
          transition={{ duration: dur, delay: d + 0.15, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.g>
    );
  }
);

/* ════════════════════════════════════════════════
   RoyaltyCup — Premium 3D glass cup
   Transparent body that fills with burgundy liquid
   Elliptical top/bottom for cylinder volume
   ════════════════════════════════════════════════ */
const RoyaltyCup: React.FC<RoyaltyCupProps> = React.memo(({ percent, size = 360, className = '' }) => {
  const uid = useId().replace(/:/g, '');
  const p = Math.min(Math.max(percent, 0), 100);

  const W = 210;
  const H = 278;
  const steamPad = 180; // extra space above for steam
  const totalH = H + steamPad;
  const sc = size / totalH;

  /* ── Geometry — tapered cylinder (1.5x) ── */
  const lidBot = 63;
  const lidTop = 36;
  const domeTop = 15;

  // Body
  const bTop = lidBot;
  const bBot = 252;
  const bH = bBot - bTop;

  // Top ellipse (wider)
  const topRx = 63;
  const topRy = 13.5;
  const topCx = W / 2;
  const topCy = bTop;

  // Bottom ellipse (narrower)
  const botRx = 48;
  const botRy = 10.5;
  const botCx = W / 2;
  const botCy = bBot;

  // Left/right edges
  const bTL = topCx - topRx;
  const bTR = topCx + topRx;
  const bBL = botCx - botRx;
  const bBR = botCx + botRx;

  /* ── Fill ── */
  const fillH = (p / 100) * bH * 0.96;
  const fillY = bBot - fillH;
  const tF = fillH / (bH * 0.96); // 0→1

  // Fill ellipse at liquid surface
  const fillRx = botRx + (topRx - botRx) * tF;
  const fillRy = botRy + (topRy - botRy) * tF;

  // Fill left/right x at fill level
  const fL = botCx - fillRx;
  const fR = botCx + fillRx;

  const amp = p > 3 && p < 95 ? 5 : 0.8;

  const wave = (a: number, ph: number) => {
    let d = `M${fL} ${fillY}`;
    for (let i = 1; i <= 6; i++) {
      const t = i / 6;
      const cx = fL + (fR - fL) * (t - 1 / 12);
      const cy = fillY + Math.sin(t * Math.PI * 2 + ph) * a;
      const px = fL + (fR - fL) * t;
      const py = fillY + Math.sin(t * Math.PI * 2 + ph + 0.5) * a * 0.5;
      d += ` Q${cx} ${cy} ${px} ${py}`;
    }
    d += ` L${bBR} ${bBot + botRy} L${bBL} ${bBot + botRy} Z`;
    return d;
  };

  /* Body outline path */
  const bodyPath = `M${bTL} ${topCy} L${bBL} ${botCy} A${botRx} ${botRy} 0 0 0 ${bBR} ${botCy} L${bTR} ${topCy}`;

  /* Glass opacity — starts very transparent, gets slightly more visible with fill */
  const glassOpacity = 0.06 + (p / 100) * 0.04;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: W * sc, height: totalH * sc, willChange: 'transform', contain: 'layout style paint' }}
    >
      <svg width={W * sc} height={totalH * sc} viewBox={`0 ${-steamPad} ${W} ${totalH}`} fill="none">
        <defs>
          {/* Liquid — brand burgundy matching cards */}
          <linearGradient id={`liq-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7A1020" />
            <stop offset="35%" stopColor="#5A0D17" />
            <stop offset="100%" stopColor="#3D0A11" />
          </linearGradient>

          {/* Liquid surface highlight */}
          <radialGradient id={`liqTop-${uid}`} cx="0.4" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#A82040" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5A0D17" stopOpacity="0.15" />
          </radialGradient>

          {/* Glass body — realistic clear plastic/glass gradient */}
          <linearGradient id={`glass-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <stop offset="12%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.03" />
            <stop offset="85%" stopColor="#FFFFFF" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.18" />
          </linearGradient>

          {/* Glass inner shadow — right side darker */}
          <linearGradient id={`gshadow-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0" />
            <stop offset="70%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
          </linearGradient>

          {/* Glass left reflection — crisp shine */}
          <linearGradient id={`ref-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.5" />
            <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Secondary reflection — right side */}
          <linearGradient id={`ref2-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
          </linearGradient>

          {/* Glass edge — warm beige tone */}
          <linearGradient id={`edge-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#B8AE98" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#D8D0C0" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#B8AE98" stopOpacity="0.8" />
          </linearGradient>

          {/* Lid — multi-stop for volume */}
          <linearGradient id={`lid-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#F5F0E8" />
            <stop offset="60%" stopColor="#E8E0D2" />
            <stop offset="100%" stopColor="#D5CDB8" />
          </linearGradient>

          {/* Lid side shadow */}
          <linearGradient id={`lidSh-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#C8BDA6" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#C8BDA6" stopOpacity="0" />
            <stop offset="100%" stopColor="#C8BDA6" stopOpacity="0.3" />
          </linearGradient>

          {/* Steam wisp glow — subtle */}
          <radialGradient id={`stm-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Dome highlight */}
          <radialGradient id={`dhi-${uid}`} cx="0.35" cy="0.25" r="0.6">
            <stop offset="0%" stopColor="#FFF" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#FFF" stopOpacity="0" />
          </radialGradient>

          {/* Shadow beneath cup */}
          <radialGradient id={`sh-${uid}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#000" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#000" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#000" stopOpacity="0" />
          </radialGradient>

          {/* Body clip */}
          <clipPath id={`bc-${uid}`}>
            <path d={`M${bTL} ${topCy} L${bBL} ${botCy} A${botRx} ${botRy} 0 0 0 ${bBR} ${botCy} L${bTR} ${topCy} A${topRx} ${topRy} 0 0 0 ${bTL} ${topCy} Z`} />
          </clipPath>

          {/* Reflection clip — narrow left strip */}
          <clipPath id={`rc-${uid}`}>
            <path d={`M${bTL} ${topCy} L${bTL + 21} ${topCy} L${bBL + 15} ${botCy} L${bBL} ${botCy} Z`} />
          </clipPath>

          {/* SVG filter for subtle glass blur */}
          <filter id={`glow-${uid}`}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* ── Drop shadow ── */}
        <ellipse cx={botCx} cy={bBot + 15} rx={botRx + 6} ry={7} fill={`url(#sh-${uid})`} />

        {/* ── STEAM — candle-like thin wisps ── */}
        <g transform={`translate(0, ${domeTop - 2})`} opacity={0.7}>
            <SteamWisp d={0} x={100} sway={5} uid={uid} />
            <SteamWisp d={1.4} x={108} sway={-4} uid={uid} />
            <SteamWisp d={2.6} x={104} sway={7} uid={uid} />
        </g>

        {/* ═══ CUP BODY ═══ */}

        {/* Glass body fill — multi-layer for depth */}
        <path
          d={`${bodyPath} A${topRx} ${topRy} 0 0 0 ${bTL} ${topCy} Z`}
          fill={`url(#glass-${uid})`}
          opacity={glassOpacity * 6}
        />
        {/* Right-side shadow for volume */}
        <path
          d={`${bodyPath} A${topRx} ${topRy} 0 0 0 ${bTL} ${topCy} Z`}
          fill={`url(#gshadow-${uid})`}
          opacity={0.5}
        />

        {/* ── LIQUID FILL ── */}
        {p > 0 && (
          <g clipPath={`url(#bc-${uid})`}>
            {/* Main liquid body */}
            <motion.path
              d={wave(amp, 0)}
              fill={`url(#liq-${uid})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.95, y: [0, -1.5, 0, 1.5, 0] }}
              transition={{
                opacity: { duration: 0.3 },
                y: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
            {/* Secondary sloshing wave */}
            {p > 3 && p < 95 && (
              <motion.path
                d={wave(amp * 1.4, Math.PI * 0.8)}
                fill="#6B1020"
                opacity={0.18}
                animate={{ x: [0, 3, -3, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}
          </g>
        )}

        {/* Liquid surface ellipse — 3D top */}
        {p > 2 && p < 98 && (
          <motion.ellipse
            cx={topCx}
            cy={fillY}
            rx={fillRx}
            ry={fillRy}
            fill={`url(#liqTop-${uid})`}
            opacity={0.7}
            animate={{ ry: [fillRy, fillRy * 1.3, fillRy], cy: [fillY, fillY - 1, fillY] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* ── Glass reflections ── */}

        {/* Primary left reflection — wide soft */}
        <path
          d={`M${bTL + 2} ${topCy + 4} L${bTL + 19} ${topCy + 4} L${bBL + 14} ${botCy - 3} L${bBL} ${botCy - 3} Z`}
          fill={`url(#ref-${uid})`}
          opacity={0.7}
        />
        {/* Sharp thin highlight inside left reflection */}
        <path
          d={`M${bTL + 6} ${topCy + 12} L${bTL + 10} ${topCy + 12} L${bBL + 7} ${botCy - 12} L${bBL + 4} ${botCy - 12} Z`}
          fill="white"
          opacity={0.3}
        />

        {/* Right soft reflection */}
        <path
          d={`M${bTR - 12} ${topCy + 9} L${bTR - 2} ${topCy + 9} L${bBR} ${botCy - 4} L${bBR - 9} ${botCy - 4} Z`}
          fill={`url(#ref2-${uid})`}
          opacity={0.5}
        />

        {/* ── Edge lines with proper weight ── */}
        {/* Left edge — slightly thicker, warm */}
        <line x1={bTL} y1={topCy} x2={bBL} y2={botCy} stroke="#B8AE96" strokeWidth={2.2} opacity={0.6} />
        {/* Right edge */}
        <line x1={bTR} y1={topCy} x2={bBR} y2={botCy} stroke="#C0B8A4" strokeWidth={1.8} opacity={0.45} />

        {/* ── Bottom ellipse (3D base) ── */}
        <ellipse cx={botCx} cy={botCy} rx={botRx} ry={botRy}
          fill="none" stroke="#B8AE96" strokeWidth={1.8} opacity={0.5} />
        {/* Inner bottom ellipse for depth */}
        <ellipse cx={botCx} cy={botCy + 1.5} rx={botRx - 4} ry={botRy - 2}
          fill="none" stroke="#D0C8B8" strokeWidth={0.8} opacity={0.25} />

        {/* ── Top ellipse rim ── */}
        <path
          d={`M${bTL} ${topCy} A${topRx} ${topRy} 0 0 1 ${bTR} ${topCy}`}
          fill="none" stroke="#B8AE96" strokeWidth={1.6} opacity={0.4}
        />

        {/* ── VERTICAL LOGO — logo_home.png повёрнут на -90° (буква "R" внизу) ── */}
        {(() => {
          // Логотип занимает ~85% высоты тела стакана, вписан по ширине
          const logoH = bH * 0.85;          // высота, ограниченная высотой тела
          const logoW = logoH * 0.28;       // визуальная "ширина" вертикального лого
          const cx = W / 2;
          const cy = bTop + bH / 2;
          // После rotate(-90) ширина-высота меняются местами: рисуем горизонтально,
          // а поворачиваем вокруг центра — так левая часть логотипа окажется внизу.
          return (
            <image
              href="/images/logo_home.png"
              x={cx - logoH / 2}
              y={cy - logoW / 2}
              width={logoH}
              height={logoW}
              preserveAspectRatio="xMidYMid meet"
              transform={`rotate(-90, ${cx}, ${cy})`}
              opacity={0.9}
              style={{ pointerEvents: 'none' }}
            />
          );
        })()}

        {/* ═══ LID ═══ */}

        {/* Lid body — main shape */}
        <path
          d={`M${topCx - topRx - 1.5} ${lidBot} L${topCx - topRx + 3} ${lidTop} L${topCx + topRx - 3} ${lidTop} L${topCx + topRx + 1.5} ${lidBot} Z`}
          fill={`url(#lid-${uid})`}
        />
        {/* Lid side shadow for volume */}
        <path
          d={`M${topCx - topRx - 1.5} ${lidBot} L${topCx - topRx + 3} ${lidTop} L${topCx + topRx - 3} ${lidTop} L${topCx + topRx + 1.5} ${lidBot} Z`}
          fill={`url(#lidSh-${uid})`}
        />

        {/* Dome curve */}
        <path
          d={`M${topCx - topRx + 9} ${lidTop} Q${topCx} ${domeTop} ${topCx + topRx - 9} ${lidTop}`}
          fill={`url(#lid-${uid})`}
          stroke="#C0B8A6"
          strokeWidth={0.8}
        />
        {/* Dome highlight */}
        <path
          d={`M${topCx - 27} ${lidTop - 3} Q${topCx - 7} ${domeTop + 3} ${topCx + 22} ${lidTop - 3}`}
          fill={`url(#dhi-${uid})`}
        />

        {/* Lip/rim — thicker with shadow */}
        <rect
          x={topCx - topRx - 4.5} y={lidBot - 6}
          width={topRx * 2 + 9} height={9} rx={3}
          fill={`url(#lid-${uid})`}
          stroke="#B8AE96" strokeWidth={0.7}
        />
        {/* Rim bottom shadow line */}
        <line
          x1={topCx - topRx - 3} y1={lidBot + 3}
          x2={topCx + topRx + 3} y2={lidBot + 3}
          stroke="#B0A890" strokeWidth={0.8} opacity={0.4}
        />

        {/* Sip hole — darker, more realistic */}
        <ellipse cx={topCx - 12} cy={lidTop + 3} rx={8} ry={3.3} fill="#3A1A10" opacity={0.6} />
        {/* Sip hole inner highlight */}
        <ellipse cx={topCx - 10.5} cy={lidTop + 2.2} rx={3.8} ry={1.5} fill="#2A0E08" opacity={0.3} />

        {/* Lid ridges — texture lines */}
        <line x1={topCx - topRx + 7} y1={lidTop + 7} x2={topCx + topRx - 7} y2={lidTop + 7} stroke="#C0B8A4" strokeWidth={0.8} opacity={0.4} />
        <line x1={topCx - topRx + 6} y1={lidTop + 12} x2={topCx + topRx - 6} y2={lidTop + 12} stroke="#C8C0AC" strokeWidth={0.6} opacity={0.3} />
        <line x1={topCx - topRx + 5} y1={lidTop + 16.5} x2={topCx + topRx - 5} y2={lidTop + 16.5} stroke="#D0C8B4" strokeWidth={0.5} opacity={0.2} />

        {/* Front half of top ellipse (on top of lid) */}
        <path
          d={`M${bTL} ${topCy} A${topRx} ${topRy} 0 0 0 ${bTR} ${topCy}`}
          fill="none" stroke="#A8A090" strokeWidth={1.8} opacity={0.45}
        />

        {/* ── Animated shine streak — premium feel ── */}
        <motion.line
          x1={bTL + 6} y1={topCy + 15}
          x2={bBL + 4} y2={botCy - 9}
          stroke="white"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.08}
          animate={{ opacity: [0.03, 0.18, 0.03] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Second subtle traveling highlight */}
        <motion.line
          x1={bTR - 9} y1={topCy + 22}
          x2={bBR - 6} y2={botCy - 15}
          stroke="white"
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.04}
          animate={{ opacity: [0.02, 0.1, 0.02] }}
          transition={{ duration: 5, delay: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  );
});

export default RoyaltyCup;
