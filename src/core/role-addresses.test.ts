// Tests for role addresses: shared inboxes like info@ or noreply@ that usually nobody reads.
import { describe, expect, it } from "vitest";
import { isRoleAddress } from "./role-addresses";

describe("isRoleAddress", () => {
    it.each(["info@acme.example", "noreply@acme.example", "no-reply@acme.example", "Support@acme.example", "admin+alerts@acme.example", "accounts@vdm-logistics.example"])(
        "flags %s",
        (email) => {
            expect(isRoleAddress(email)).toBe(true);
        },
    );

    it.each(["thandi.mokoena@example.com", "information.desk.manager@acme.example", "infod@acme.example", "sales.jo@acme.example"])("does not flag %s", (email) => {
        expect(isRoleAddress(email)).toBe(false);
    });
});
