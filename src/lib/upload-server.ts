import fs from 'fs/promises';
import path from 'path';

/**
 * Server-side upload utility that works for both local development and Vercel deployment
 * On Vercel: Uses base64 encoding (stored as data URL)
 * On local: Saves to filesystem in public/uploads/profile_images
 * 
 * This file should ONLY be imported in API routes (server-side)
 */
export async function uploadProfileImage(file: File): Promise<string> {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.');
    }

    if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size is too large. Maximum allowed size is 10MB.');
    }

    // Check if we're on Vercel (serverless environment)
    // Vercel doesn't have persistent filesystem, so we use base64
    const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

    if (isVercel) {
        // On Vercel: Convert to base64 data URL
        // Note: This stores images in the database as base64
        // For production at scale, consider using:
        // - Vercel Blob Storage (recommended)
        // - AWS S3
        // - Cloudinary
        // - Other cloud storage services
        try {
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${file.type};base64,${base64}`;

            // Limit size check (base64 adds ~33% overhead)
            if (dataUrl.length > 15 * 1024 * 1024) { // ~11MB original becomes ~15MB base64
                throw new Error('Image too large for base64 storage. Please use a smaller image.');
            }

            return dataUrl;
        } catch (error: any) {
            if (error.message.includes('too large')) {
                throw error;
            }
            console.error('Base64 conversion error:', error);
            throw new Error('Failed to process profile image');
        }
    } else {
        // On local: Save to filesystem
        const timestamp = Date.now();
        const extension = file.name.split('.').pop() || 'jpg';
        const filename = `profile_${timestamp}.${extension}`;
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profile_images');

        try {
            await fs.mkdir(uploadDir, { recursive: true });
            const filePath = path.join(uploadDir, filename);
            const bytes = await file.arrayBuffer();
            await fs.writeFile(filePath, Buffer.from(bytes));
            return `uploads/profile_images/${filename}`;
        } catch (error) {
            console.error('File upload error:', error);
            throw new Error('Failed to save profile image to filesystem');
        }
    }
}

