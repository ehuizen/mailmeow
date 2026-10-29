// Props every screen receives from App: the current state, a way to dispatch actions, and the derived clean result.
import type { Dispatch } from "react";
import type { FlowAction, FlowState } from "@/app/flow-reducer";
import type { CleanResult } from "@/core/clean-list";

/**
 * Why screens get state + dispatch as props (and no global store): there are only nine screens and one reducer,
 * so props keep the data flow obvious. A state library would add a dependency without solving a real problem.
 */
export interface ScreenProps {
    state: FlowState;
    dispatch: Dispatch<FlowAction>;
    /** `cleanList` applied to the current choices; `null` until something has been extracted. */
    result: CleanResult | null;
}
