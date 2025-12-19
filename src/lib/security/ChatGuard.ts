export class ChatGuard {
    private static patterns = [
        // Phone Numbers
        // 08x-xxx-xxxx, 08x xxx xxxx, 08xxxxxxxx
        /(^|\s|[^0-9])0[689]\d{1}[-\s]?\d{3}[-\s]?\d{4}($|\s|[^0-9])/,
        // +66 8x, 66-8x
        /(^|\s|[^0-9])(\+66|66)[-\s]?\d{2}[-\s]?\d{3}[-\s]?\d{4}($|\s|[^0-9])/,

        // Line ID variations
        // Line ID: myline, lineid myline, line-id: myline
        /(^|\s)(line\s*(-)?\s*id|lineid)[\s:]+[a-zA-Z0-9_.]+/i,
        // LINE: myline
        /(^|\s)line\s*:\s*[a-zA-Z0-9_.]+/i,
        // @myline (common for Line)
        /(^|\s)@[a-zA-Z0-9_.]+/i,
        // line.me links
        /line\.me\/ti\/p\/[a-zA-Z0-9]+/i,

        // Socials & Keywords
        // "facebook me", "fb"
        /(^|\s)(facebook|fb)\s/i,
        // "DM me", "inbox me"
        /(^|\s)(dm|inbox)\s+(me)?/i,

        // Thai Phrases
        // โอนตรงได้ไหม (Can I transfer directly?)
        /โอนตรง/i,
        // แอดไลน์หน่อย (Add Line please)
        /แอดไลน์/i,
        // อินบ็อกซ์มา (Inbox me)
        /อินบ็อกซ์/i,

        // Obfuscation (spaced out characters)
        // f a c e b o o k
        /f\s*a\s*c\s*e\s*b\s*o\s*o\s*k/i,
    ];

    // Whitelist specific false positives if needed
    private static whitelist = [
        // Example: "fabric" contains "fb" but valid? Actually our regex for fb requires space/boundary.
    ];

    /**
     * Checks if the message content contains any forbidden patterns.
     * @param content The message text to scan.
     * @returns True if a pattern is matched, false otherwise.
     */
    static isSuspect(content: string): boolean {
        // Normalize content strictly for this check if needed (e.g. lower case)
        // But our regex uses 'i' flag.

        for (const pattern of this.patterns) {
            if (pattern.test(content)) {

                // Double check for known false positives that might be tricky in Regex
                // "fabric" vs "fb" - handled by (\s) or start of string anchors in regex?
                // The regex `/(^|\s)(facebook|fb)\s/i` enforces a space after "fb", so "fabric" shouldn't match.

                return true;
            }
        }
        return false;
    }

    /**
     * Returns the matched pattern for debugging purposes.
     */
    static getMatchedPattern(content: string): RegExp | null {
        for (const pattern of this.patterns) {
            if (pattern.test(content)) {
                return pattern;
            }
        }
        return null;
    }
}
