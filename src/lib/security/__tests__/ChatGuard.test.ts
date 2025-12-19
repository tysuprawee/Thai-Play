import { ChatGuard } from '../ChatGuard';

describe('ChatGuard', () => {
    const shouldMatch = [
        "0812345678",
        "081-234-5678",
        "081 234 5678",
        "+66 81 234 5678",
        "66-81-234-5678",
        "Line ID: myline",
        "lineid myline",
        "line-id: myline",
        "LINE: myline",
        "@myline",
        // "id: myline", // Removed as 'id:' is now allowed
        "line.me/ti/p/AbCdEf",
        "facebook me",
        "fb me",
        "DM me",
        "inbox me",
        "โอนตรงได้ไหม",
        "แอดไลน์หน่อย",
        "อินบ็อกซ์มา",
        "f a c e b o o k",
    ];

    const shouldNotMatch = [
        "",
        "hello there",
        "fabric",      // should not match fb
        "@",           // too short
        "idk:",        // not "id:"
        "id: 1234",    // generic id should be allowed
        "pass: 1234",  // password sharing should be allowed
        "This is a normal message",
        "Can I seek for a refund?",
        "id-card", // might trigger id: ? Check regex.
        "pass: 1234" // common usage for sending account info, should be allowed? User said "pass: or others are fine"
    ];

    test.each(shouldMatch)('should match suspect content: "%s"', (content) => {
        expect(ChatGuard.isSuspect(content)).toBe(true);
    });

    test.each(shouldNotMatch)('should NOT match innocent content: "%s"', (content) => {
        expect(ChatGuard.isSuspect(content)).toBe(false);
    });
});
