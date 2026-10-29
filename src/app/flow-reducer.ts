// The app's state machine: which screen is showing, what the user added, and every choice they've made since.
import type { BlockEntry } from "@/core/block";
import type { ExtractionSummary, SourceReport } from "@/files/extract-sources";

/** Every screen in the flow. "nothing-found" is the error screen after extraction finds zero addresses. */
export type Screen = "welcome" | "add" | "processing" | "found" | "nothing-found" | "check-list" | "keep-off" | "review" | "export";

/**
 * `clean`: the full flow. `dedupe-only`: the "Just remove duplicates" shortcut from the Welcome screen,
 * which goes Add → Processing → Found → Export and never removes anything except duplicates.
 */
export type Mode = "clean" | "dedupe-only";

/** The kinds of "check against" list the user can say they're uploading (only used for wording and their own clarity). */
export type ListType = "unsubscribes" | "bounces" | "contacts" | "other";

/** The check-against list after it has been read. */
export interface CheckList {
    /** Addresses found in the uploaded/pasted list (lowercased). */
    emails: string[];
    /** One report per uploaded file or pasted text. */
    sources: SourceReport[];
}

/** All app state. Everything lives in memory only; "Start over" resets it and lets the browser free the data. */
export interface FlowState {
    screen: Screen;
    mode: Mode;
    pastedText: string;
    files: File[];
    extraction: ExtractionSummary | null;
    /** Set when extraction found more than the 50,000 limit; shows the refusal dialog on the Add screen. */
    overLimitTotal: number | null;
    /** Set when extraction failed unexpectedly (e.g. the worker crashed); shown on the Add screen. */
    extractionError: string | null;
    removeDuplicates: boolean;
    mergeGmail: boolean;
    listTypes: ListType[];
    checkList: CheckList | null;
    blocks: BlockEntry[];
    removeRoleAddresses: boolean;
    manuallyRemoved: ReadonlySet<string>;
}

/** Everything that can happen. Screens dispatch these; they never change state directly. */
export type FlowAction =
    | { type: "start"; mode: Mode }
    | { type: "go-to"; screen: Screen }
    | { type: "set-pasted-text"; text: string }
    | { type: "add-files"; files: File[] }
    | { type: "remove-file"; index: number }
    | { type: "start-processing" }
    | { type: "extraction-finished"; summary: ExtractionSummary }
    | { type: "extraction-stopped" }
    | { type: "extraction-failed"; message: string }
    | { type: "dismiss-over-limit" }
    | { type: "choose-duplicates"; remove: boolean }
    | { type: "set-merge-gmail"; merge: boolean }
    | { type: "toggle-list-type"; listType: ListType }
    | { type: "set-check-list"; checkList: CheckList | null }
    | { type: "skip-check-list"; toExport: boolean }
    | { type: "add-block"; entry: BlockEntry }
    | { type: "remove-block"; index: number }
    | { type: "set-include-subdomains"; index: number; include: boolean }
    | { type: "set-remove-role-addresses"; remove: boolean }
    | { type: "skip-keep-off" }
    | { type: "remove-email"; email: string }
    | { type: "restore-email"; email: string }
    | { type: "start-over" };

/** Starting state: Welcome screen, nothing added, the agreed defaults (remove duplicates and role addresses). */
export const initialFlowState: FlowState = {
    screen: "welcome",
    mode: "clean",
    pastedText: "",
    files: [],
    extraction: null,
    overLimitTotal: null,
    extractionError: null,
    removeDuplicates: true,
    mergeGmail: false,
    listTypes: ["unsubscribes", "bounces"],
    checkList: null,
    blocks: [],
    removeRoleAddresses: true,
    manuallyRemoved: new Set(),
};

/** Where "Back" goes from each screen. Why a table: one place to read and test the navigation rules. */
export function previousScreen(state: Pick<FlowState, "screen" | "mode">): Screen {
    switch (state.screen) {
        case "add":
            return "welcome";
        case "found":
        case "nothing-found":
            return "add";
        case "check-list":
            return "found";
        case "keep-off":
            return "check-list";
        case "review":
            return "keep-off";
        case "export":
            return state.mode === "dedupe-only" ? "found" : "review";
        default:
            return "welcome";
    }
}

/**
 * Pure reducer for the whole flow (used with React's `useReducer`).
 *
 * Why a reducer and not a router: data only lives in memory, so a URL per screen would just lead to empty screens
 * after a refresh. A reducer keeps every transition in one tested function, and screens stay simple: they show
 * state and dispatch actions.
 * Why options are stored rather than applied: the actual cleaning is recomputed from the original list by
 * `cleanList` (see `use-clean-result.ts`), so Back and Skip can never leave the data half-changed.
 */
export function flowReducer(state: FlowState, action: FlowAction): FlowState {
    switch (action.type) {
        case "start":
            return { ...initialFlowState, mode: action.mode, screen: "add" };
        case "go-to":
            return { ...state, screen: action.screen };
        case "set-pasted-text":
            return { ...state, pastedText: action.text };
        case "add-files":
            return { ...state, files: [...state.files, ...action.files] };
        case "remove-file":
            return { ...state, files: state.files.filter((_, i) => i !== action.index) };
        case "start-processing":
            return { ...state, screen: "processing", overLimitTotal: null, extractionError: null };
        case "extraction-finished": {
            const { summary } = action;
            if (summary.overLimit) return { ...state, screen: "add", extraction: null, overLimitTotal: summary.totalFound };
            // A fresh list invalidates choices that referred to the old one.
            const reset = { removeDuplicates: true, mergeGmail: false, manuallyRemoved: new Set<string>() };
            return { ...state, ...reset, extraction: summary, screen: summary.emails.length === 0 ? "nothing-found" : "found" };
        }
        case "extraction-stopped":
            return { ...state, screen: "add" };
        case "extraction-failed":
            return { ...state, screen: "add", extractionError: action.message };
        case "dismiss-over-limit":
            return { ...state, overLimitTotal: null };
        case "choose-duplicates":
            return { ...state, removeDuplicates: action.remove, screen: state.mode === "dedupe-only" ? "export" : "check-list" };
        case "set-merge-gmail":
            return { ...state, mergeGmail: action.merge };
        case "toggle-list-type": {
            const has = state.listTypes.includes(action.listType);
            return { ...state, listTypes: has ? state.listTypes.filter((t) => t !== action.listType) : [...state.listTypes, action.listType] };
        }
        case "set-check-list":
            return { ...state, checkList: action.checkList };
        case "skip-check-list":
            return { ...state, checkList: null, screen: action.toExport ? "export" : "keep-off" };
        case "add-block": {
            const key = (e: BlockEntry) => (e.kind === "email" ? e.email : e.domain);
            if (state.blocks.some((b) => b.kind === action.entry.kind && key(b) === key(action.entry))) return state;
            return { ...state, blocks: [...state.blocks, action.entry] };
        }
        case "remove-block":
            return { ...state, blocks: state.blocks.filter((_, i) => i !== action.index) };
        case "set-include-subdomains":
            return {
                ...state,
                blocks: state.blocks.map((b, i) => (i === action.index && b.kind === "domain" ? { ...b, includeSubdomains: action.include } : b)),
            };
        case "set-remove-role-addresses":
            return { ...state, removeRoleAddresses: action.remove };
        case "skip-keep-off":
            return { ...state, blocks: [], removeRoleAddresses: false, screen: "review" };
        case "remove-email":
            return { ...state, manuallyRemoved: new Set([...state.manuallyRemoved, action.email]) };
        case "restore-email": {
            const next = new Set(state.manuallyRemoved);
            next.delete(action.email);
            return { ...state, manuallyRemoved: next };
        }
        case "start-over":
            return initialFlowState;
    }
}
