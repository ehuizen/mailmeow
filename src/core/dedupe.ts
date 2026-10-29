// Removes duplicate addresses and reports which ones were repeated, for the "Hang on, N duplicates!" screen.

/** An address that appeared more than once. */
export interface RepeatedEmail {
    email: string;
    /** How many times it appeared in total (always 2 or more). */
    copies: number;
}

/** Result of {@link dedupe}. */
export interface DedupeResult {
    /** One copy of each address, in the order each was first seen. */
    unique: string[];
    /** How many extra copies were dropped (`input length - unique length`). */
    duplicateCount: number;
    /** Repeated addresses, most copies first. Ties keep first-seen order. */
    repeated: RepeatedEmail[];
}

/**
 * Removes duplicate addresses.
 *
 * What: keeps the first copy of each address and counts the rest.
 * Input should already be lowercased (as {@link extractEmails} returns it), so the dedupe is case-insensitive.
 *
 * Why a Map: one pass and constant-time lookups, so 50,000 addresses take milliseconds. The legacy app's
 * `filter` + `indexOf` approach was O(n²), about 19 s at 100,000 addresses. A Map also keeps insertion order,
 * so the list stays in the order the user pasted it.
 *
 * @param emails Lowercased addresses, duplicates allowed.
 * @example dedupe(["a@x.example", "a@x.example"]) // { unique: ["a@x.example"], duplicateCount: 1, repeated: [{ email: "a@x.example", copies: 2 }] }
 */
export function dedupe(emails: readonly string[]): DedupeResult {
    const counts = new Map<string, number>();
    for (const email of emails) counts.set(email, (counts.get(email) ?? 0) + 1);

    const repeated: RepeatedEmail[] = [];
    for (const [email, copies] of counts) if (copies > 1) repeated.push({ email, copies });
    // Array.prototype.sort is stable, so ties stay in first-seen order.
    repeated.sort((a, b) => b.copies - a.copies);

    return { unique: [...counts.keys()], duplicateCount: emails.length - counts.size, repeated };
}
