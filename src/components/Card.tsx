// Small presentational building blocks used across screens: Card, StatCard and Callout.
import { AlertCircle, CheckCircle, InfoCircle } from "@untitledui/icons";
import type { FC, ReactNode } from "react";
import { cx } from "@/utils/cx";

/** A white rounded panel with the Untitled UI border and shadow. */
export function Card({ children, className, as: Tag = "section", "aria-label": ariaLabel }: { children: ReactNode; className?: string; as?: "section" | "div"; "aria-label"?: string }) {
    return (
        <Tag aria-label={ariaLabel} className={cx("flex flex-col gap-5 rounded-xl border border-secondary bg-primary p-6 shadow-xs", className)}>
            {children}
        </Tag>
    );
}

/** One big number with a label, e.g. "Duplicates · 1,286". */
export function StatCard({ label, value, hint, tone = "default" }: { label: string; value: string; hint?: ReactNode; tone?: "default" | "brand" | "warning" }) {
    return (
        <div className="flex flex-1 flex-col gap-2 rounded-xl border border-secondary bg-primary p-5 shadow-xs">
            <span className="text-sm font-medium text-tertiary">{label}</span>
            <span className="text-display-sm font-semibold text-primary">{value}</span>
            {hint && <span className={cx("text-sm font-medium", tone === "brand" ? "text-brand-secondary" : tone === "warning" ? "text-warning-primary" : "text-tertiary")}>{hint}</span>}
        </div>
    );
}

type CalloutTone = "info" | "success" | "warning" | "error";

const CALLOUT_STYLES: Record<CalloutTone, { box: string; title: string; icon: FC<{ className?: string }> }> = {
    info: { box: "bg-brand-primary border-brand", title: "text-brand-secondary", icon: InfoCircle },
    success: { box: "bg-success-primary border-utility-green-200", title: "text-success-primary", icon: CheckCircle },
    warning: { box: "bg-warning-primary border-utility-yellow-200", title: "text-warning-primary", icon: AlertCircle },
    error: { box: "bg-error-primary border-error_subtle", title: "text-error-primary", icon: AlertCircle },
};

/**
 * A tinted message box with an icon, a bold title and optional detail.
 * Why the icon and wording carry the meaning, not just colour: people who can't tell green from amber still get it.
 */
export function Callout({ tone, title, children, role }: { tone: CalloutTone; title: ReactNode; children?: ReactNode; role?: "alert" | "status" }) {
    const style = CALLOUT_STYLES[tone];
    const Icon = style.icon;
    return (
        <div role={role} className={cx("flex gap-3 rounded-lg border p-4", style.box)}>
            <Icon className={cx("mt-0.5 size-5 shrink-0", style.title)} aria-hidden="true" />
            <div className="flex flex-1 flex-col gap-1">
                <p className={cx("text-sm font-semibold", style.title)}>{title}</p>
                {children && <div className="text-sm text-secondary">{children}</div>}
            </div>
        </div>
    );
}
