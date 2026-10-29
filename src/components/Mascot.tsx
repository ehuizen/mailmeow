// The MailMeow cat: an SVG mascot with a mood per screen. Placeholder art until real Lottie animations exist.
import { cx } from "@/utils/cx";

/** One mood per moment in the flow. The screen picks the mood; the art adds a prop or expression. */
export type MascotMood = "idle" | "sniffing" | "searching" | "detective" | "clipboard" | "bouncer" | "approving" | "celebrate" | "confused";

export interface MascotProps {
    mood?: MascotMood;
    /** Rendered width and height in pixels. */
    size?: number;
    className?: string;
}

// Illustration colours. Why not theme tokens: this is artwork (fur, nose), not UI. Brand-coloured props
// (hat, confetti) do use the brand token, so a rebrand recolours them.
const FUR = "#F4A259";
const FUR_DARK = "#D9822B";
const INNER_EAR = "#FBD3C0";
const MUZZLE = "#FFF4E6";
const NOSE = "#E57B92";
const LINE = "#6B3F1D";
const INK = "#101828";
const BRAND = "var(--color-brand-600)";
const BRAND_DARK = "var(--color-brand-800)";
const BRAND_LIGHT = "var(--color-brand-100)";

const HAPPY_EYES: MascotMood[] = ["approving", "celebrate"];

/**
 * The cat mascot.
 *
 * Why SVG for now: no cat animations exist yet. The agreed plan is dotLottie, so this component is the single place
 * to swap in `<DotLottieReact>` later, with the same `mood` prop, and no screen has to change.
 * Why `aria-hidden`: the mascot is decoration. Every screen says the same thing in text, so screen readers skip it.
 * The gentle bob comes from the `.mascot-animate` CSS class and stops for people who prefer reduced motion.
 *
 * @example <Mascot mood="detective" size={96} />
 */
export function Mascot({ mood = "idle", size = 160, className }: MascotProps) {
    const happy = HAPPY_EYES.includes(mood);
    return (
        <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" focusable="false" data-mood={mood} className={cx("mascot-animate shrink-0", className)}>
            <circle cx="100" cy="100" r="100" fill={BRAND_LIGHT} />
            {mood === "celebrate" && <Confetti />}
            <path d="M48 98 L56 38 L98 70 Z" fill={FUR} />
            <path d="M152 98 L144 38 L102 70 Z" fill={FUR} />
            <path d="M60 84 L63 54 L86 72 Z" fill={INNER_EAR} />
            <path d="M140 84 L137 54 L114 72 Z" fill={INNER_EAR} />
            <ellipse cx="100" cy="112" rx="58" ry="52" fill={FUR} />
            <path d="M100 62 v14 M88 64 l4 12 M112 64 l-4 12" stroke={FUR_DARK} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="100" cy="134" rx="26" ry="17" fill={MUZZLE} />
            {mood === "bouncer" ? (
                <g fill={INK}>
                    <rect x="62" y="100" width="32" height="18" rx="6" />
                    <rect x="106" y="100" width="32" height="18" rx="6" />
                    <path d="M94 106 h12" stroke={INK} strokeWidth="4" />
                </g>
            ) : happy ? (
                <path d="M70 112 q8 -10 16 0 M114 112 q8 -10 16 0" stroke={INK} strokeWidth="4.5" strokeLinecap="round" fill="none" />
            ) : (
                <g>
                    <ellipse cx="78" cy="110" rx="7.5" ry="9.5" fill={INK} />
                    <ellipse cx="122" cy="110" rx="7.5" ry="9.5" fill={INK} />
                    <circle cx="80.5" cy="106.5" r="2.5" fill="#FFFFFF" />
                    <circle cx="124.5" cy="106.5" r="2.5" fill="#FFFFFF" />
                </g>
            )}
            <path d="M93 124 h14 l-7 8 z" fill={NOSE} />
            <path d="M100 132 v5 M100 137 c-3 5 -9 5 -12 1 M100 137 c3 5 9 5 12 1" stroke={LINE} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M74 130 H44 M74 137 L46 145 M126 130 H156 M126 137 L154 145" stroke={LINE} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
            {mood === "idle" && <Paw />}
            {mood === "sniffing" && <path d="M58 118 q-10 4 -18 0 M58 128 q-10 6 -20 6 M142 118 q10 4 18 0 M142 128 q10 6 20 6" stroke={BRAND} strokeWidth="3" strokeLinecap="round" fill="none" />}
            {(mood === "searching" || mood === "detective") && <MagnifyingGlass />}
            {mood === "detective" && <DeerstalkerHat />}
            {mood === "clipboard" && <Clipboard />}
            {mood === "celebrate" && <PartyHat />}
            {mood === "confused" && (
                <text x="160" y="64" fontSize="46" fontWeight="700" fill={BRAND} fontFamily="Inter, system-ui, sans-serif">
                    ?
                </text>
            )}
            {mood === "approving" && <path d="M140 158 l10 10 l20 -22" stroke="var(--color-fg-success-primary)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
        </svg>
    );
}

const Paw = () => (
    <g>
        <ellipse cx="160" cy="150" rx="16" ry="14" fill={FUR} />
        <path d="M152 140 v6 M160 138 v7 M168 140 v6" stroke={FUR_DARK} strokeWidth="3" strokeLinecap="round" />
    </g>
);

const MagnifyingGlass = () => (
    <g>
        <circle cx="152" cy="150" r="18" fill="#FFFFFF" fillOpacity="0.55" stroke="#344054" strokeWidth="6" />
        <path d="M165 163 L184 182" stroke="#344054" strokeWidth="9" strokeLinecap="round" />
    </g>
);

const DeerstalkerHat = () => (
    <g>
        <path d="M54 78 C58 48 80 36 100 36 C120 36 142 48 146 78 Z" fill={BRAND} />
        <path d="M46 78 H154" stroke={BRAND_DARK} strokeWidth="8" strokeLinecap="round" />
        <circle cx="100" cy="36" r="5" fill={BRAND_DARK} />
    </g>
);

const Clipboard = () => (
    <g>
        <rect x="128" y="128" width="44" height="56" rx="6" fill="#FFFFFF" stroke="#344054" strokeWidth="4" />
        <rect x="140" y="122" width="20" height="10" rx="3" fill="#344054" />
        <path d="M138 148 l4 4 l8 -8 M138 166 l4 4 l8 -8" stroke="var(--color-fg-success-primary)" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </g>
);

const PartyHat = () => (
    <g>
        <path d="M100 14 L80 66 L120 66 Z" fill={BRAND} />
        <circle cx="100" cy="14" r="6" fill="#FDB022" />
    </g>
);

const Confetti = () => (
    <g>
        <rect x="24" y="40" width="10" height="5" rx="2" fill="#FDB022" transform="rotate(25 29 42)" />
        <rect x="164" y="34" width="10" height="5" rx="2" fill={BRAND} transform="rotate(-20 169 36)" />
        <rect x="176" y="96" width="10" height="5" rx="2" fill="#12B76A" transform="rotate(40 181 98)" />
        <rect x="14" y="110" width="10" height="5" rx="2" fill="#F04438" transform="rotate(-35 19 112)" />
        <circle cx="40" cy="168" r="4" fill={BRAND} />
        <circle cx="168" cy="172" r="4" fill="#FDB022" />
    </g>
);
