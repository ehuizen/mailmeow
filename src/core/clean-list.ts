// The whole cleaning pipeline as one pure function: found addresses + the user's choices → the final list and why each removal happened.
import { type BlockEntry, createBlocker } from "./block";
import { dedupe } from "./dedupe";
import { mergeGmailGroups } from "./gmail";
import { isListed } from "./match-list";
import { isRoleAddress } from "./role-addresses";

/** Every choice the user makes across the cleaning screens. */
export interface CleanOptions {
    /** "Remove duplicates" vs "Keep duplicates" on the Found screen. */
    removeDuplicates: boolean;
    /** "Also merge Gmail look-alikes" checkbox on the Found screen. */
    mergeGmail: boolean;
    /** Lookup from "Check against a list" (see `buildMatchSet`), or `null` when skipped. */
    listSet: ReadonlySet<string> | null;
    /** Domains and people from "Keep anyone off". */
    blocks: readonly BlockEntry[];
    /** "Remove role addresses" toggle (on by default). */
    removeRoleAddresses: boolean;
    /** Single addresses the user removed on the Review screen. */
    manuallyRemoved: ReadonlySet<string>;
}

/** The defaults before the user changes anything. */
export const DEFAULT_CLEAN_OPTIONS: CleanOptions = {
    removeDuplicates: true,
    mergeGmail: false,
    listSet: null,
    blocks: [],
    removeRoleAddresses: true,
    manuallyRemoved: new Set(),
};

/** How many addresses each step removed. Each address is counted once, under the first step that removed it. */
export interface RemovalCounts {
    duplicates: number;
    gmailMerged: number;
    listed: number;
    blocked: number;
    role: number;
    manual: number;
}

/** Result of {@link cleanList}. */
export interface CleanResult {
    /** The final list, in the original order. */
    kept: string[];
    removed: RemovalCounts;
    /** Sum of all removals: `found.length - kept.length`. */
    removedTotal: number;
}

/**
 * Applies every cleaning step, in the order the screens show them:
 * duplicates → Gmail look-alikes → check-against list → blocked domains/people → role addresses → manual removals.
 *
 * Why recompute everything from the original list: the screens never mutate data, they only change options.
 * So "Back", "Skip" and changing your mind always give the right result, and the Review funnel numbers always add up.
 * Every step is a Set lookup, so the whole pipeline over 50,000 addresses takes milliseconds and can run on every change.
 *
 * @param found Addresses from extraction (lowercased, duplicates included).
 * @param options The user's choices.
 * @example cleanList(["a@x.example", "a@x.example", "info@x.example"], DEFAULT_CLEAN_OPTIONS).kept // ["a@x.example"]
 */
export function cleanList(found: readonly string[], options: CleanOptions): CleanResult {
    const removed: RemovalCounts = { duplicates: 0, gmailMerged: 0, listed: 0, blocked: 0, role: 0, manual: 0 };
    let list: readonly string[] = found;

    if (options.removeDuplicates) {
        const result = dedupe(list);
        list = result.unique;
        removed.duplicates = result.duplicateCount;
    }
    if (options.mergeGmail) {
        const result = mergeGmailGroups(list);
        list = result.kept;
        removed.gmailMerged = result.mergedCount;
    }

    const isBlocked = createBlocker(options.blocks);
    const kept: string[] = [];
    for (const email of list) {
        if (options.listSet && isListed(email, options.listSet)) removed.listed++;
        else if (isBlocked(email)) removed.blocked++;
        else if (options.removeRoleAddresses && isRoleAddress(email)) removed.role++;
        else if (options.manuallyRemoved.has(email)) removed.manual++;
        else kept.push(email);
    }

    return { kept, removed, removedTotal: found.length - kept.length };
}
