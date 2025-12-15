export const ADMIN_EMAILS = [
    'admin@thaiplay.com', // Replace or add real admin emails here
    'bugatti@example.com' // Placeholder based on username, user needs to edit this
];

export function isAdmin(email: string | undefined | null): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email);
}
