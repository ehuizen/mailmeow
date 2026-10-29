// Drag-and-drop area plus a "choose files" button, built on React Aria so it works with keyboard and screen readers.
import { UploadCloud02 } from "@untitledui/icons";
import { DropZone, FileTrigger, isFileDropItem } from "react-aria-components";
import { ACCEPT_ATTRIBUTE } from "@/core/limits";
import { cx } from "@/utils/cx";

export interface DropzoneProps {
    onFiles: (files: File[]) => void;
    /** Main line, e.g. "Click to upload or drag and drop files". */
    label?: string;
    /** Secondary line, e.g. supported types and limits. */
    hint?: string;
    multiple?: boolean;
}

/**
 * File input that accepts both drag-and-drop and a normal file picker.
 *
 * Why React Aria's `DropZone` + `FileTrigger`: a plain `<div onDrop>` can't be used without a mouse. React Aria
 * makes the drop target focusable, supports keyboard "paste to drop", and the button opens the native picker.
 * Why files aren't read here: this only hands `File` objects to the flow. Reading happens later in the worker.
 */
export function Dropzone({ onFiles, label = "Click to upload or drag and drop files", hint = "TXT, CSV, XLSX, HTML or JSON · up to 50,000 emails", multiple = true }: DropzoneProps) {
    const accepted = ACCEPT_ATTRIBUTE.split(",");
    return (
        <DropZone
            aria-label="Drop files here"
            onDrop={async (event) => {
                const files = await Promise.all(event.items.filter(isFileDropItem).map((item) => item.getFile()));
                if (files.length) onFiles(multiple ? files : files.slice(0, 1));
            }}
            className={({ isDropTarget, isFocusVisible }) =>
                cx(
                    "flex flex-col items-center gap-3 rounded-xl border border-dashed border-primary bg-primary px-6 py-6 text-center transition",
                    isDropTarget && "border-brand bg-brand-primary",
                    isFocusVisible && "ring-4 ring-brand-solid/20",
                )
            }
        >
            <span className="flex size-10 items-center justify-center rounded-lg border border-secondary bg-primary shadow-xs">
                <UploadCloud02 className="size-5 text-fg-secondary" aria-hidden="true" />
            </span>
            <FileTrigger acceptedFileTypes={accepted} allowsMultiple={multiple} onSelect={(list) => list && onFiles(Array.from(list))}>
                <button type="button" className="cursor-pointer text-sm font-semibold text-brand-secondary hover:text-brand-secondary_hover focus-visible:outline-2 focus-visible:outline-brand">
                    {label}
                </button>
            </FileTrigger>
            <p className="text-sm text-tertiary">{hint}</p>
        </DropZone>
    );
}
