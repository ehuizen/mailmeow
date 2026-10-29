// Screen 2, Add emails: paste text and/or drop files, with an instant check of each file and the over-limit dialog.
import { ArrowRight, Mail01 } from "@untitledui/icons";
import { useDeferredValue, useMemo } from "react";
import { Heading } from "react-aria-components";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { Badge, BadgeWithIcon } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { AlertCircle } from "@untitledui/icons";
import { Callout, Card } from "@/components/Card";
import { Dropzone } from "@/components/Dropzone";
import { FileChip } from "@/components/FileChip";
import { PageHeading } from "@/components/PageHeading";
import { ScreenLayout } from "@/components/ScreenLayout";
import { extractEmails } from "@/core/extract-emails";
import { checkFile, type FileVerdict, MAX_EMAILS } from "@/core/limits";
import { formatBytes, formatCount, pluralize } from "@/app/format";
import type { ScreenProps } from "./types";

/** What each file verdict means to a person, and how alarming it looks. */
const VERDICT_TEXT: Record<FileVerdict, { text: string; tone: "default" | "warning" | "error" }> = {
    ok: { text: "Ready", tone: "default" },
    warn: { text: "Large file: this may take a moment", tone: "warning" },
    "too-big": { text: "Too big to read in a browser (max 100 MB for text, 30 MB for Excel)", tone: "error" },
    unsupported: { text: "Can't read this type of file. Save it as CSV or TXT, or paste the text instead.", tone: "error" },
};

/**
 * The Add screen.
 *
 * Why check files immediately (by name and size) instead of after processing: telling someone "PDFs can't be read"
 * the moment they drop one is kinder than after a 3-second wait.
 * Why the live count only covers pasted text: files are read in the worker on "Find emails", so the UI never
 * blocks. Pasted text is already in memory, and `useDeferredValue` keeps typing smooth while it's counted.
 */
export function AddEmails({ state, dispatch }: Pick<ScreenProps, "state" | "dispatch">) {
    const deferredText = useDeferredValue(state.pastedText);
    const pastedCount = useMemo(() => (deferredText.trim() ? extractEmails(deferredText).emails.length : 0), [deferredText]);
    const usableFiles = state.files.filter((f) => {
        const verdict = checkFile(f);
        return verdict === "ok" || verdict === "warn";
    });
    const canContinue = state.pastedText.trim().length > 0 || usableFiles.length > 0;

    return (
        <ScreenLayout
            title="Add your emails"
            step="Add"
            onBack={() => dispatch({ type: "go-to", screen: "welcome" })}
            actions={
                <Button iconTrailing={ArrowRight} isDisabled={!canContinue} onPress={() => dispatch({ type: "start-processing" })}>
                    Find emails
                </Button>
            }
        >
            <PageHeading
                title="Add your emails"
                subtitle="Paste text, drop files, or both. MailMeow will find every address."
                mood="sniffing"
                badge={state.mode === "dedupe-only" ? <Badge color="brand" size="sm">Just removing duplicates</Badge> : undefined}
            />

            {state.extractionError && (
                <Callout tone="error" title="Something went wrong while reading your files" role="alert">
                    {state.extractionError}. Try again, or paste the text instead.
                </Callout>
            )}

            <Card aria-label="Your emails">
                <TextArea
                    label="Paste text"
                    placeholder="Paste a CRM export, an email thread, a spreadsheet column… anything with email addresses in it."
                    rows={6}
                    value={state.pastedText}
                    onChange={(text) => dispatch({ type: "set-pasted-text", text })}
                />

                <div className="flex items-center gap-3" aria-hidden="true">
                    <span className="h-px flex-1 bg-quaternary" />
                    <span className="text-sm font-medium text-placeholder">or</span>
                    <span className="h-px flex-1 bg-quaternary" />
                </div>

                <Dropzone onFiles={(files) => dispatch({ type: "add-files", files })} />

                {state.files.length > 0 && (
                    <ul className="flex flex-col gap-3" aria-label="Added files">
                        {state.files.map((file, index) => {
                            const verdict = VERDICT_TEXT[checkFile(file)];
                            return (
                                <FileChip
                                    key={`${file.name}-${index}`}
                                    name={file.name}
                                    meta={`${formatBytes(file.size)} · ${verdict.text}`}
                                    tone={verdict.tone}
                                    onRemove={() => dispatch({ type: "remove-file", index })}
                                />
                            );
                        })}
                    </ul>
                )}
            </Card>

            {pastedCount > 0 && (
                <div aria-live="polite">
                    <BadgeWithIcon type="pill-color" color="brand" size="md" iconLeading={Mail01}>
                        {pluralize(pastedCount, "email")} spotted in your pasted text{usableFiles.length > 0 ? ", plus your files" : ""}
                    </BadgeWithIcon>
                </div>
            )}

            <ModalOverlay isOpen={state.overLimitTotal !== null} onOpenChange={(open) => !open && dispatch({ type: "dismiss-over-limit" })} isDismissable>
                <Modal className="max-w-120">
                    <Dialog className="flex flex-col gap-5 p-6">
                        <FeaturedIcon icon={AlertCircle} color="warning" theme="light" size="lg" />
                        <div className="flex flex-col gap-1">
                            <Heading slot="title" className="text-lg font-semibold text-primary">
                                That&apos;s more than {formatCount(MAX_EMAILS)} emails
                            </Heading>
                            <p className="text-sm text-tertiary">
                                We found about {formatCount(state.overLimitTotal ?? 0)} addresses. MailMeow handles up to {formatCount(MAX_EMAILS)} at a time so your browser stays fast. Split the file
                                and run it in parts.
                            </p>
                        </div>
                        <Button onPress={() => dispatch({ type: "dismiss-over-limit" })}>OK, I&apos;ll split it</Button>
                    </Dialog>
                </Modal>
            </ModalOverlay>
        </ScreenLayout>
    );
}
