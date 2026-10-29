// "Check against a list": builds a fast lookup from an unsubscribe/bounce list and tests addresses against it.
import { gmailKey } from "./gmail";

/**
 * Builds a lookup Set from a list of addresses (unsubscribes, bounces, existing contacts).
 *
 * What: trims and lowercases each entry and stores both the address and its Gmail canonical form.
 *
 * Why store the Gmail form too: if someone unsubscribed as `jdoe@gmail.com` and your list has `j.doe+news@gmail.com`,
 * that's the same inbox. For unsubscribes, removing one person too many is the safe side; emailing someone who
 * opted out is a legal risk (POPIA / GDPR). Why a Set: lookups are constant-time, so 15,000 × 15,000 checks take
 * milliseconds instead of the legacy app's O(n·m) `includes()` loop (about 46 s at 100,000).
 *
 * @param listEmails Addresses from the user's list, any case, whitespace allowed.
 * @example isListed("j.doe@gmail.com", buildMatchSet(["JDOE@gmail.com"])) // true
 */
export function buildMatchSet(listEmails: Iterable<string>): Set<string> {
    const set = new Set<string>();
    for (const raw of listEmails) {
        const email = raw.trim().toLowerCase();
        if (!email) continue;
        set.add(email);
        set.add(gmailKey(email));
    }
    return set;
}

/**
 * Is this address on the list? Matches exactly (case-insensitively) or as the same Gmail inbox.
 *
 * @param email A lowercased address.
 * @param matchSet A Set from {@link buildMatchSet}.
 */
export function isListed(email: string, matchSet: ReadonlySet<string>): boolean {
    return matchSet.has(email) || matchSet.has(gmailKey(email));
}
