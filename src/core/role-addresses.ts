// Role addresses: shared inboxes (info@, noreply@…) rather than a person. Removed by default in "Keep anyone off".

/**
 * Local parts that belong to a role, not a person. Exact matches only, so `information.desk.manager@` or `sales.jo@`
 * (real people) are not caught.
 */
export const ROLE_LOCAL_PARTS: ReadonlySet<string> = new Set([
    "info", "noreply", "no-reply", "donotreply", "do-not-reply", "support", "admin", "administrator", "sales", "hello",
    "contact", "office", "enquiries", "inquiries", "help", "team", "billing", "accounts", "marketing", "webmaster",
    "postmaster", "hostmaster", "abuse", "mailer-daemon", "newsletter", "careers", "jobs", "hr", "privacy", "security",
    "press", "media", "reception", "notifications", "orders", "feedback",
]);

/**
 * Is this a role address (a shared inbox like `info@` or `noreply@`)?
 *
 * Why remove them by default: nobody personally reads most of them, they often bounce or auto-reply, and they hurt
 * a mailing list's engagement. The user can switch this off with one toggle.
 *
 * @param email A lowercased address. A `+tag` is ignored (`admin+alerts@` counts as `admin@`).
 * @example isRoleAddress("noreply@acme.example") // true
 */
export function isRoleAddress(email: string): boolean {
    const local = email.slice(0, email.lastIndexOf("@")).split("+")[0].toLowerCase();
    return ROLE_LOCAL_PARTS.has(local);
}
