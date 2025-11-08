/**
 * Client-side utility for handling profile image URLs
 * This file is safe to import in client components
 */

/**
 * Get profile image URL - handles both filesystem paths and base64 data URLs
 */
export function getProfileImageUrl(profileImage: string | null | undefined): string {
    if (!profileImage) {
        return '/frontend/img/default profile.png';
    }

    // If it's a base64 data URL (Vercel), return as-is
    if (profileImage.startsWith('data:')) {
        return profileImage;
    }

    // If it already starts with /, return as-is
    if (profileImage.startsWith('/')) {
        return profileImage;
    }

    // If it starts with uploads/, add leading slash
    if (profileImage.startsWith('uploads/')) {
        return `/${profileImage}`;
    }

    // If it starts with frontend/, add leading slash
    if (profileImage.startsWith('frontend/')) {
        return `/${profileImage}`;
    }

    // Default: assume it's in frontend/img/
    return `/frontend/img/${profileImage}`;
}
