// Gmail's address rules: dots and anything after "+" are ignored, so several spellings can reach one inbox.

/** Domains where Gmail's rules apply. googlemail.com is Gmail's old name in some countries. */
const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Returns the canonical form of a Gmail address: dots removed, `+tag` removed, domain `gmail.com`.
 * Non-Gmail addresses are returned unchanged.
 *
 * Why only Gmail: at most other providers and company domains the dots *do* matter (`john.smith` and `johnsmith`
 * can be two people), so applying the rule everywhere would wrongly merge real people.
 *
 * @param email A lowercased address.
 * @example gmailKey("j.doe+news@gmail.com") // "jdoe@gmail.com"
 */
export function gmailKey(email: string): string {
    const at = email.lastIndexOf("@");
    if (!GMAIL_DOMAINS.has(email.slice(at + 1))) return email;
    const local = email.slice(0, at).split("+")[0];
    return `${local.replaceAll(".", "")}@gmail.com`;
}

/** Several spellings of one Gmail inbox. */
export interface GmailGroup {
    /** The canonical address, e.g. `jdoe@gmail.com`. */
    key: string;
    /** The different spellings found, in first-seen order (2 or more). */
    addresses: string[];
}

/**
 * Finds groups of different-looking addresses that reach the same Gmail inbox.
 *
 * Why flag instead of merging: the user may filter mail by `+tag`, or may not trust the rule. The Found screen
 * shows these groups and only merges them if the user ticks the box.
 *
 * @param uniqueEmails Lowercased, already-deduplicated addresses.
 * @example findGmailGroups(["jdoe@gmail.com", "j.doe+x@gmail.com"]) // [{ key: "jdoe@gmail.com", addresses: [...both] }]
 */
export function findGmailGroups(uniqueEmails: readonly string[]): GmailGroup[] {
    const byKey = new Map<string, string[]>();
    for (const email of uniqueEmails) {
        const key = gmailKey(email);
        if (key === email && !GMAIL_DOMAINS.has(email.slice(email.lastIndexOf("@") + 1))) continue;
        const group = byKey.get(key);
        if (group) group.push(email);
        else byKey.set(key, [email]);
    }
    return [...byKey].filter(([, addresses]) => addresses.length > 1).map(([key, addresses]) => ({ key, addresses }));
}

/**
 * Keeps only the first spelling of each Gmail inbox. Non-Gmail addresses are always kept.
 *
 * @param emails Lowercased addresses.
 * @returns The kept addresses (original order) and how many look-alikes were dropped.
 * @example mergeGmailGroups(["jdoe@gmail.com", "j.doe@gmail.com"]) // { kept: ["jdoe@gmail.com"], mergedCount: 1 }
 */
export function mergeGmailGroups(emails: readonly string[]): { kept: string[]; mergedCount: number } {
    const seen = new Set<string>();
    const kept: string[] = [];
    for (const email of emails) {
        const key = gmailKey(email);
        if (key !== email || GMAIL_DOMAINS.has(email.slice(email.lastIndexOf("@") + 1))) {
            if (seen.has(key)) continue;
            seen.add(key);
        }
        kept.push(email);
    }
    return { kept, mergedCount: emails.length - kept.length };
}
