// Root component: holds the flow state, derives the cleaned list, and renders the current screen.
import { useReducer } from "react";
import { AnnouncerProvider } from "@/components/Announcer";
import { AddEmails } from "@/screens/AddEmails";
import { CheckList } from "@/screens/CheckList";
import { Export } from "@/screens/Export";
import { Found } from "@/screens/Found";
import { KeepOff } from "@/screens/KeepOff";
import { NothingFound } from "@/screens/NothingFound";
import { Processing } from "@/screens/Processing";
import { Review } from "@/screens/Review";
import { Welcome } from "@/screens/Welcome";
import { flowReducer, initialFlowState } from "./flow-reducer";
import { useCleanResult } from "./use-clean-result";

export interface AppProps {
    /** Minimum time the Processing screen stays up. 3 s in the app (agreed on the board); tests pass 0. */
    processingMinimumMs?: number;
}

/**
 * The whole app.
 *
 * Why everything hangs off one `useReducer`: all state is in memory and belongs to one flow, so a single reducer
 * (tested in `flow-reducer.test.ts`) is the simplest thing that works. "Start over" resets it to the initial state,
 * dropping every reference so the browser can free the data.
 */
export function App({ processingMinimumMs = 3000 }: AppProps) {
    const [state, dispatch] = useReducer(flowReducer, initialFlowState);
    const result = useCleanResult(state);
    const props = { state, dispatch, result };

    return (
        <AnnouncerProvider>
            {state.screen === "welcome" && <Welcome dispatch={dispatch} />}
            {state.screen === "add" && <AddEmails state={state} dispatch={dispatch} />}
            {state.screen === "processing" && <Processing state={state} dispatch={dispatch} minimumMs={processingMinimumMs} />}
            {state.screen === "found" && <Found state={state} dispatch={dispatch} />}
            {state.screen === "nothing-found" && <NothingFound state={state} dispatch={dispatch} />}
            {state.screen === "check-list" && <CheckList {...props} />}
            {state.screen === "keep-off" && <KeepOff {...props} />}
            {state.screen === "review" && <Review {...props} />}
            {state.screen === "export" && <Export {...props} />}
        </AnnouncerProvider>
    );
}
