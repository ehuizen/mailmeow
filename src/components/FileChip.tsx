// One added file: icon, name, a status line and a remove button. Turns red when the file can't be used.
import { AlertCircle, File06, Trash01 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

/**
 * A row representing one file.
 * Why a visible label on the remove button for screen readers: icon-only buttons need an accessible name,
 * and "Remove contacts.xlsx" says exactly which file goes.
 */
export function FileChip({ name, meta, tone = "default", onRemove }: { name: string; meta: string; tone?: "default" | "warning" | "error"; onRemove?: () => void }) {
    const Icon = tone === "default" ? File06 : AlertCircle;
    return (
        <li className={cx("flex items-center gap-3 rounded-xl border p-4", tone === "error" ? "border-error_subtle bg-error-primary" : tone === "warning" ? "border-utility-yellow-200 bg-warning-primary" : "border-secondary bg-primary")}>
            <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", tone === "default" ? "bg-brand-secondary" : "bg-primary")}>
                <Icon className={cx("size-5", tone === "error" ? "text-fg-error-primary" : tone === "warning" ? "text-fg-warning-primary" : "text-fg-brand-primary")} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-secondary">{name}</span>
                <span className={cx("text-sm", tone === "error" ? "text-error-primary" : tone === "warning" ? "text-warning-primary" : "text-tertiary")}>{meta}</span>
            </div>
            {onRemove && (
                <button type="button" onClick={onRemove} aria-label={`Remove ${name}`} className="rounded-md p-2 text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-brand">
                    <Trash01 className="size-5" aria-hidden="true" />
                </button>
            )}
        </li>
    );
}
