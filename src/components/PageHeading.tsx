// A screen's heading row: the cat in the right mood, the title (the screen's only h1) and a supporting sentence.
import type { ReactNode } from "react";
import { Mascot, type MascotMood } from "./Mascot";

/**
 * Title block used at the top of most screens.
 * Why exactly one `<h1>` per screen: `ScreenLayout` moves focus to it on navigation, and screen reader users jump by headings.
 */
export function PageHeading({ title, subtitle, mood, badge }: { title: string; subtitle?: ReactNode; mood?: MascotMood; badge?: ReactNode }) {
    return (
        <div className="flex items-center gap-6">
            {mood && <Mascot mood={mood} size={88} />}
            <div className="flex flex-col gap-2">
                {badge}
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{title}</h1>
                {subtitle && <p className="text-lg text-tertiary">{subtitle}</p>}
            </div>
        </div>
    );
}
