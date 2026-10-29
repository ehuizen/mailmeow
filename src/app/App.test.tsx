// End-to-end tests of the app in jsdom: real screens, real reducer and core, with extraction running inline (no Worker in jsdom).
// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

function setup() {
    const user = userEvent.setup();
    render(<App processingMinimumMs={0} />);
    return user;
}

async function pasteAndFind(user: ReturnType<typeof userEvent.setup>, text: string) {
    await user.click(screen.getByLabelText(/^Paste text/));
    await user.paste(text);
    await user.click(screen.getByRole("button", { name: /find emails/i }));
}

describe("MailMeow app", () => {
    it("runs the whole clean-up flow from paste to export", async () => {
        const user = setup();
        await user.click(screen.getByRole("button", { name: /clean a list/i }));
        expect(screen.getByRole("heading", { level: 1, name: "Add your emails" })).toHaveFocus();

        await pasteAndFind(user, "Jo <a@x.example>, A@X.example; info@x.example | b@y.example comp@competitor.example and asdf@asdf");

        expect(await screen.findByRole("heading", { level: 1, name: "We found 5 emails" })).toBeInTheDocument();
        expect(screen.getByText("Hang on, 1 duplicate!")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Remove duplicates" }));

        expect(screen.getByRole("heading", { level: 1, name: "Check against a list?" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /paste emails instead/i }));
        await user.click(screen.getByLabelText(/^Paste the emails to remove/));
        await user.paste("B@Y.example");
        await user.click(screen.getByRole("button", { name: "Use these emails" }));
        expect(await screen.findByText("1 of your emails is on this list and will be removed")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /remove 1 & continue/i }));

        expect(screen.getByRole("heading", { level: 1, name: "Keep anyone off?" })).toBeInTheDocument();
        await user.type(screen.getByLabelText(/^Add a domain or email/), "co.za{Enter}");
        expect(screen.getByText(/blocking it would remove everyone/i)).toBeInTheDocument();
        await user.clear(screen.getByLabelText(/^Add a domain or email/));
        await user.type(screen.getByLabelText(/^Add a domain or email/), "competitor.example{Enter}");
        await user.click(screen.getByRole("button", { name: /remove 2 & review/i }));

        expect(screen.getByRole("heading", { level: 1, name: "Your clean list: 1 email" })).toBeInTheDocument();
        const table = screen.getByRole("table");
        expect(within(table).getByText("a@x.example")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /looks good, export/i }));

        expect(screen.getByRole("heading", { level: 1, name: "All clean! 1 email ready." })).toBeInTheDocument();
        expect(screen.getByText(/4 removed: 1 duplicates, 1 from your list, 2 kept off/)).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: /start over/i }));
        expect(screen.getByRole("heading", { level: 1, name: /paste anything/i })).toBeInTheDocument();
    });

    it("'Just remove duplicates' removes only duplicates and goes straight to export", async () => {
        const user = setup();
        await user.click(screen.getByRole("button", { name: /just remove duplicates/i }));
        await pasteAndFind(user, "info@x.example a@x.example a@x.example");
        await user.click(await screen.findByRole("button", { name: /remove duplicates & export/i }));
        expect(screen.getByRole("heading", { level: 1, name: "All clean! 2 emails ready." })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Back" }));
        expect(screen.getByRole("heading", { level: 1, name: "We found 3 emails" })).toBeInTheDocument();
    });

    it("explains when nothing was found and leads back to Add", async () => {
        const user = setup();
        await user.click(screen.getByRole("button", { name: /clean a list/i }));
        await pasteAndFind(user, "no addresses here, just asdf@asdf and @handle");
        expect(await screen.findByRole("heading", { level: 1, name: "Hmm, no emails in there" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /back to add emails/i }));
        expect(screen.getByRole("heading", { level: 1, name: "Add your emails" })).toBeInTheDocument();
    });

    it("refuses more than 50,000 emails with a clear dialog", async () => {
        const user = setup();
        await user.click(screen.getByRole("button", { name: /clean a list/i }));
        await pasteAndFind(user, Array.from({ length: 50_001 }, (_, i) => `u${i}@x.example`).join("\n"));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).getByText("That's more than 50,000 emails")).toBeInTheDocument();
        await user.click(within(dialog).getByRole("button", { name: /split it/i }));
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("keeps Find emails disabled until something is added", async () => {
        const user = setup();
        await user.click(screen.getByRole("button", { name: /clean a list/i }));
        expect(screen.getByRole("button", { name: /find emails/i })).toBeDisabled();
    });
});
