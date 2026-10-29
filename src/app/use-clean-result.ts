// Connects the flow state to the core pipeline: turns the user's choices into the cleaned list, recomputed only when needed.
import { useMemo } from "react";
import { type CleanOptions, type CleanResult, cleanList } from "@/core/clean-list";
import { buildMatchSet } from "@/core/match-list";
import type { FlowState } from "./flow-reducer";

/**
 * Converts flow state into options for `cleanList`.
 *
 * Why "dedupe-only" overrides everything else: the "Just remove duplicates" shortcut promises exactly that, so it must
 * not quietly remove role addresses (which are removed by default in the full flow).
 */
export function cleanOptionsFrom(
    state: Pick<FlowState, "mode" | "removeDuplicates" | "mergeGmail" | "blocks" | "removeRoleAddresses" | "manuallyRemoved">,
    listSet: ReadonlySet<string> | null,
): CleanOptions {
    const dedupeOnly = state.mode === "dedupe-only";
    return {
        removeDuplicates: state.removeDuplicates,
        mergeGmail: state.mergeGmail,
        listSet: dedupeOnly ? null : listSet,
        blocks: dedupeOnly ? [] : state.blocks,
        removeRoleAddresses: dedupeOnly ? false : state.removeRoleAddresses,
        manuallyRemoved: state.manuallyRemoved,
    };
}

/**
 * The cleaned list for the current state, memoised.
 *
 * Why memoise: `cleanList` is fast (milliseconds for 50,000 addresses), but the Review screen re-renders on every
 * keystroke in the search box, and the match Set for a 15,000-address list only needs building when the list changes.
 *
 * @returns The `cleanList` result, or `null` before anything has been extracted.
 */
export function useCleanResult(state: FlowState): CleanResult | null {
    const listSet = useMemo(() => (state.checkList ? buildMatchSet(state.checkList.emails) : null), [state.checkList]);
    const { extraction, mode, removeDuplicates, mergeGmail, blocks, removeRoleAddresses, manuallyRemoved } = state;
    return useMemo(() => {
        if (!extraction) return null;
        const options = cleanOptionsFrom({ mode, removeDuplicates, mergeGmail, blocks, removeRoleAddresses, manuallyRemoved }, listSet);
        return cleanList(extraction.emails, options);
    }, [extraction, mode, removeDuplicates, mergeGmail, blocks, removeRoleAddresses, manuallyRemoved, listSet]);
}
