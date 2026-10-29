// Tests for CSV and plain-text export of the final list.
import { describe, expect, it } from "vitest";
import { toCsv, toPlainText } from "./to-csv";

describe("toCsv", () => {
    it("writes a header and one address per row", () => {
        expect(toCsv(["a@b.example", "ben.o'connor@example.co.za"])).toBe("email\r\na@b.example\r\nben.o'connor@example.co.za\r\n");
    });

    it("quotes values that contain commas, quotes or line breaks (defensive)", () => {
        expect(toCsv(['odd,"value"'])).toBe('email\r\n"odd,""value"""\r\n');
    });

    it("guards against spreadsheet formula injection", () => {
        expect(toCsv(["=cmd@x.example", "+sum@x.example"])).toBe("email\r\n'=cmd@x.example\r\n'+sum@x.example\r\n");
    });
});

describe("toPlainText", () => {
    it("puts one address per line", () => {
        expect(toPlainText(["a@b.example", "c@d.example"])).toBe("a@b.example\nc@d.example");
    });
});
