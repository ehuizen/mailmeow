// Gets the final list out of the browser: copy to clipboard, or download as CSV or Excel. Nothing is uploaded.
import { toCsv, toPlainText } from "@/core/to-csv";

/** Base name for downloads, e.g. "mailmeow-clean-list-2026-10-29". The date helps people tell exports apart. */
export function exportFileName(now: Date = new Date()): string {
    return `mailmeow-clean-list-${now.toISOString().slice(0, 10)}`;
}

/** Triggers a browser download of `blob` without any server: an object URL and a temporary link. */
function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on the next tick: some browsers need the URL alive until the click has been handled.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Downloads the list as a one-column CSV.
 * Why a UTF-8 BOM: without it, Excel on Windows guesses the wrong encoding and mangles non-ASCII text.
 */
export function downloadCsv(emails: readonly string[]): void {
    downloadBlob(new Blob(["﻿", toCsv(emails)], { type: "text/csv;charset=utf-8" }), `${exportFileName()}.csv`);
}

/**
 * Downloads the list as an Excel workbook with a single "Email" column.
 * Why a dynamic import: SheetJS is only needed by people who choose Excel, so it isn't in the main bundle.
 */
export async function downloadXlsx(emails: readonly string[]): Promise<void> {
    const XLSX = await import("xlsx");
    const sheet = XLSX.utils.aoa_to_sheet([["Email"], ...emails.map((email) => [email])]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Clean list");
    const data: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
    downloadBlob(new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${exportFileName()}.xlsx`);
}

/**
 * Copies the list to the clipboard, one address per line (the format mail tools accept in To/BCC).
 *
 * Why the fallback: `navigator.clipboard` only exists on secure pages and can be blocked by browser settings.
 * The old `execCommand("copy")` still works in those cases.
 *
 * @returns true if copied.
 */
export async function copyList(emails: readonly string[]): Promise<boolean> {
    const text = toPlainText(emails);
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        return copied;
    }
}
