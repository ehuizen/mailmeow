// Tests for the flow state machine: navigation, skips, the duplicates-only shortcut, limits and starting over.
import { describe, expect, it } from "vitest";
import type { ExtractionSummary } from "@/files/extract-sources";
import { type FlowAction, type FlowState, flowReducer, initialFlowState, previousScreen } from "./flow-reducer";
import { cleanOptionsFrom } from "./use-clean-result";

const summary = (emails: string[], extra: Partial<ExtractionSummary> = {}): ExtractionSummary => ({
    emails,
    totalFound: emails.length,
    overLimit: false,
    skipped: [],
    skippedCount: 0,
    sources: [],
    ...extra,
});

const run = (actions: FlowAction[], from: FlowState = initialFlowState) => actions.reduce(flowReducer, from);

describe("flowReducer", () => {
    it("walks the full flow: add → processing → found → check list → keep off → review → export", () => {
        let state = run([{ type: "start", mode: "clean" }, { type: "set-pasted-text", text: "a@x.example" }, { type: "start-processing" }]);
        expect(state.screen).toBe("processing");
        state = run([{ type: "extraction-finished", summary: summary(["a@x.example"]) }], state);
        expect(state.screen).toBe("found");
        state = run([{ type: "choose-duplicates", remove: true }], state);
        expect(state.screen).toBe("check-list");
        state = run([{ type: "skip-check-list", toExport: false }], state);
        expect(state.screen).toBe("keep-off");
        state = run([{ type: "skip-keep-off" }], state);
        expect(state.screen).toBe("review");
    });

    it("shows the nothing-found screen when extraction finds no addresses", () => {
        const state = run([{ type: "start", mode: "clean" }, { type: "start-processing" }, { type: "extraction-finished", summary: summary([]) }]);
        expect(state.screen).toBe("nothing-found");
    });

    it("refuses over-limit results and returns to Add with the total for the dialog", () => {
        const state = run([{ type: "start", mode: "clean" }, { type: "start-processing" }, { type: "extraction-finished", summary: summary([], { overLimit: true, totalFound: 184_000 }) }]);
        expect(state.screen).toBe("add");
        expect(state.overLimitTotal).toBe(184_000);
        expect(flowReducer(state, { type: "dismiss-over-limit" }).overLimitTotal).toBeNull();
    });

    it("duplicates-only mode jumps from Found straight to Export, and Back returns to Found", () => {
        const state = run([{ type: "start", mode: "dedupe-only" }, { type: "start-processing" }, { type: "extraction-finished", summary: summary(["a@x.example"]) }, { type: "choose-duplicates", remove: true }]);
        expect(state.screen).toBe("export");
        expect(previousScreen(state)).toBe("found");
    });

    it("duplicates-only mode never removes role addresses, list matches or blocked domains", () => {
        const state: FlowState = { ...initialFlowState, mode: "dedupe-only", blocks: [{ kind: "domain", domain: "x.example", includeSubdomains: false }] };
        const options = cleanOptionsFrom(state, new Set(["a@x.example"]));
        expect(options).toMatchObject({ removeRoleAddresses: false, listSet: null, blocks: [] });
    });

    it("skip to export clears the check list and jumps to Export", () => {
        const state = run([{ type: "set-check-list", checkList: { emails: ["a@x.example"], sources: [] } }, { type: "skip-check-list", toExport: true }]);
        expect(state.checkList).toBeNull();
        expect(state.screen).toBe("export");
    });

    it("skipping 'keep anyone off' removes blocks and the role-address default", () => {
        const state = run([{ type: "add-block", entry: { kind: "email", email: "a@x.example" } }, { type: "skip-keep-off" }]);
        expect(state.blocks).toEqual([]);
        expect(state.removeRoleAddresses).toBe(false);
    });

    it("ignores the same block twice and toggles subdomains per domain", () => {
        const entry = { kind: "domain", domain: "acme.example", includeSubdomains: false } as const;
        let state = run([{ type: "add-block", entry }, { type: "add-block", entry }]);
        expect(state.blocks).toHaveLength(1);
        state = flowReducer(state, { type: "set-include-subdomains", index: 0, include: true });
        expect(state.blocks[0]).toEqual({ ...entry, includeSubdomains: true });
    });

    it("removes and restores single emails on the Review screen", () => {
        let state = flowReducer(initialFlowState, { type: "remove-email", email: "a@x.example" });
        expect(state.manuallyRemoved.has("a@x.example")).toBe(true);
        state = flowReducer(state, { type: "restore-email", email: "a@x.example" });
        expect(state.manuallyRemoved.size).toBe(0);
    });

    it("start over drops everything", () => {
        const state = run([{ type: "start", mode: "clean" }, { type: "set-pasted-text", text: "a@x.example" }, { type: "start-over" }]);
        expect(state).toEqual(initialFlowState);
    });

    it("Back goes to the previous screen in the flow", () => {
        expect(previousScreen({ screen: "review", mode: "clean" })).toBe("keep-off");
        expect(previousScreen({ screen: "export", mode: "clean" })).toBe("review");
        expect(previousScreen({ screen: "nothing-found", mode: "clean" })).toBe("add");
    });
});
