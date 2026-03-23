/**
 * UserAvatar  - shows the user's photo if uploaded, otherwise picks one of
 * 8 hand-crafted SVG illustrated characters based on a stable hash of the
 * user's ID. Every user always gets the same default avatar across sessions.
 */

import { useMemo, useState } from "react";

type Props = {
  /** User's uploaded avatar URL  - if truthy we render an <img> instead. */
  src?: string | null;
  /** Stable identifier used to pick a default illustration (user ID, email, etc). */
  uid?: string;
  /** Pixel size  - used for both width and height. */
  size?: number;
  /** Border radius in px  - defaults to 16 (rounded square). */
  radius?: number;
  /** Extra inline styles on the wrapper. */
  style?: React.CSSProperties;
};

// * --- 8 illustrated character SVGs ------------------------------------------
// Each is a self-contained SVG string rendered inside a coloured background.

const PALETTES = [
  { bg: "#1e3a5f", skin: "#f0c8a0", hair: "#2c1810", shirt: "#3b82f6", accent: "#60a5fa" },
  { bg: "#3b1f4a", skin: "#d4a574", hair: "#1a0f0a", shirt: "#a855f7", accent: "#c084fc" },
  { bg: "#1a3c34", skin: "#f5d5b8", hair: "#8b4513", shirt: "#10b981", accent: "#6ee7b7" },
  { bg: "#4a1942", skin: "#c89060", hair: "#0a0a0a", shirt: "#ec4899", accent: "#f9a8d4" },
  { bg: "#2d2d3d", skin: "#f0c8a0", hair: "#4a3728", shirt: "#f59e0b", accent: "#fcd34d" },
  { bg: "#1e3a2f", skin: "#e0b090", hair: "#1a0a00", shirt: "#14b8a6", accent: "#5eead4" },
  { bg: "#3d2020", skin: "#f5d5b8", hair: "#c0c0c0", shirt: "#ef4444", accent: "#fca5a5" },
  { bg: "#1a2744", skin: "#d4a574", hair: "#e879f9", shirt: "#6366f1", accent: "#a5b4fc" },
];

/**
 * Builds an SVG string for a particular character variant.
 * @param idx - which of the 8 character designs to use (0-7)
 * @returns raw SVG markup string
 */
function buildCharacterSvg(idx: number): string {
  const p = PALETTES[idx % PALETTES.length];

  const characters: string[] = [
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="50" r="26" fill="${p.skin}"/>
      <path d="M34 44 Q38 22 62 20 Q86 22 86 44 L82 42 Q78 30 60 28 Q42 30 38 42 Z" fill="${p.hair}"/>
      <circle cx="49" cy="48" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="48" r="2.5" fill="#1a1a2e"/>
      <path d="M53 58 Q60 63 67 58" stroke="#1a1a2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M48 68 L60 72 L72 68" stroke="${p.accent}" stroke-width="2" fill="none"/>
      <rect x="56" y="72" width="8" height="14" fill="${p.accent}"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="50" r="26" fill="${p.skin}"/>
      <path d="M34 48 Q36 20 60 18 Q84 20 86 48 L84 52 Q82 38 60 28 Q38 38 36 52 Z" fill="${p.hair}"/>
      <path d="M30 48 Q34 44 40 46 L34 58 Q30 52 30 48Z" fill="${p.hair}"/>
      <path d="M90 48 Q86 44 80 46 L86 58 Q90 52 90 48Z" fill="${p.hair}"/>
      <rect x="41" y="43" width="16" height="12" rx="3" fill="none" stroke="${p.accent}" stroke-width="2"/>
      <rect x="63" y="43" width="16" height="12" rx="3" fill="none" stroke="${p.accent}" stroke-width="2"/>
      <line x1="57" y1="49" x2="63" y2="49" stroke="${p.accent}" stroke-width="2"/>
      <circle cx="49" cy="49" r="2" fill="#1a1a2e"/>
      <circle cx="71" cy="49" r="2" fill="#1a1a2e"/>
      <path d="M54 60 Q60 64 66 60" stroke="#c0756b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="60" cy="72" rx="8" ry="2" fill="${p.accent}" opacity="0.6"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="50" r="26" fill="${p.skin}"/>
      <path d="M34 42 Q40 18 60 16 Q80 18 86 42 L84 38 Q78 24 60 22 Q42 24 36 38 Z" fill="${p.hair}"/>
      <path d="M40 56 Q42 72 60 74 Q78 72 80 56 Q76 68 60 70 Q44 68 40 56Z" fill="${p.hair}"/>
      <circle cx="49" cy="46" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="46" r="2.5" fill="#1a1a2e"/>
      <path d="M55 55 Q60 58 65 55" stroke="#1a1a2e" stroke-width="1.2" fill="none"/>
      <rect x="56" y="74" width="8" height="10" fill="${p.accent}" rx="1"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="52" r="26" fill="${p.skin}"/>
      <path d="M28 52 Q30 16 60 14 Q90 16 92 52 Q90 56 88 60 L86 54 Q84 24 60 20 Q36 24 34 54 L32 60 Q30 56 28 52Z" fill="${p.accent}"/>
      <path d="M32 60 Q32 80 60 82 Q88 80 88 60 L86 64 Q84 76 60 78 Q36 76 34 64 Z" fill="${p.accent}"/>
      <circle cx="49" cy="50" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="50" r="2.5" fill="#1a1a2e"/>
      <path d="M54 62 Q60 66 66 62" stroke="#c0756b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="52" r="26" fill="${p.skin}"/>
      <path d="M32 46 Q36 24 60 22 Q84 24 88 46 L90 46 Q92 42 90 38 Q84 18 60 16 Q36 18 30 38 Q28 42 30 46 Z" fill="${p.hair}"/>
      <rect x="28" y="38" width="46" height="8" rx="3" fill="${p.accent}"/>
      <circle cx="49" cy="50" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="50" r="2.5" fill="#1a1a2e"/>
      <path d="M54 61 Q60 65 66 61" stroke="#1a1a2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M48 70 L60 74 L72 70" stroke="white" stroke-width="1.5" fill="none" opacity="0.6"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="52" r="26" fill="${p.skin}"/>
      <circle cx="60" cy="22" r="14" fill="${p.hair}"/>
      <path d="M34 48 Q36 26 60 24 Q84 26 86 48 L84 44 Q80 32 60 30 Q40 32 36 44 Z" fill="${p.hair}"/>
      <circle cx="49" cy="50" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="50" r="2.5" fill="#1a1a2e"/>
      <path d="M54 62 Q60 66 66 62" stroke="#c0756b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="46" cy="56" r="4" fill="${p.skin}" opacity="0.5"/>
      <circle cx="74" cy="56" r="4" fill="${p.skin}" opacity="0.5"/>
      <ellipse cx="60" cy="74" rx="6" ry="2" fill="${p.accent}" opacity="0.5"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="50" r="26" fill="${p.skin}"/>
      <path d="M38 42 Q42 30 60 28 Q78 30 82 42 L80 40 Q76 32 60 30 Q44 32 40 40 Z" fill="${p.hair}"/>
      <circle cx="49" cy="48" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="48" r="2.5" fill="#1a1a2e"/>
      <path d="M44 56 Q48 60 54 57" stroke="${p.hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M66 57 Q72 60 76 56" stroke="${p.hair}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M55 62 Q60 65 65 62" stroke="#1a1a2e" stroke-width="1.2" fill="none"/>
      <path d="M48 68 L60 72 L72 68" stroke="${p.accent}" stroke-width="2" fill="none"/>
      <rect x="56" y="72" width="8" height="12" fill="${p.accent}"/>
    </svg>`,
    `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="120" fill="${p.bg}"/>
      <ellipse cx="60" cy="95" rx="36" ry="28" fill="${p.shirt}"/>
      <circle cx="60" cy="52" r="26" fill="${p.skin}"/>
      <path d="M32 52 Q34 22 60 18 Q86 22 88 52 L86 48 Q82 28 60 24 Q38 28 34 48 Z" fill="${p.hair}"/>
      <path d="M32 52 Q30 58 32 64 L36 56 Z" fill="${p.hair}"/>
      <path d="M88 52 Q90 58 88 64 L84 56 Z" fill="${p.hair}"/>
      <circle cx="49" cy="50" r="2.5" fill="#1a1a2e"/>
      <circle cx="71" cy="50" r="2.5" fill="#1a1a2e"/>
      <path d="M54 62 Q60 67 66 62" stroke="#c0756b" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="42" cy="50" r="3" fill="${p.accent}" opacity="0.3"/>
      <circle cx="78" cy="50" r="3" fill="${p.accent}" opacity="0.3"/>
    </svg>`,
  ];

  return characters[idx % characters.length];
}

/**
 * Simple hash of a string to a number  - deterministic so the same user
 * always gets the same avatar.
 * @param str - input string (user ID, email, etc.)
 * @returns positive integer
 */
function stableHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Reusable avatar component  - renders uploaded photo or a deterministic
 * illustrated character based on the user's ID.
 *
 * @param props.src - user's avatar URL (renders <img> if truthy)
 * @param props.uid - stable identifier for picking a default illustration
 * @param props.size - pixel dimensions (width & height)
 * @param props.radius - border radius in px
 * @param props.style - extra inline styles
 */
export default function UserAvatar({ src, uid = "", size = 48, radius = 16, style }: Props) {
  const svgMarkup = useMemo(() => {
    const idx = stableHash(uid) % 8;
    return buildCharacterSvg(idx);
  }, [uid]);

  const wrapperStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    overflow: "hidden",
    flexShrink: 0,
    ...style,
  };

  const [imgFailed, setImgFailed] = useState(false);
  const hasValidSrc = !imgFailed && typeof src === "string" && src.trim().length > 0 && src.startsWith("http");

  if (hasValidSrc) {
    return (
      <div style={wrapperStyle}>
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }

  // falls back to the deterministic illustrated character
  return <div style={wrapperStyle} dangerouslySetInnerHTML={{ __html: svgMarkup }} />;
}
