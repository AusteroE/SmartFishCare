import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { uploadProfileImage } from '@/lib/upload-server';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const username = formData.get('username') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const profileFile = formData.get('profile') as File | null;

        if (!username || !email || !password) {
            return NextResponse.json(
                { success: false, error: 'Username, email, and password are required' },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, error: 'Invalid email format' },
                { status: 400 }
            );
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true },
        });

        if (existingUser) {
            return NextResponse.json(
                { success: false, error: 'Email already exists' },
                { status: 400 }
            );
        }

        // Check if admin already exists (optional security measure)
        const adminExists = await prisma.user.findFirst({
            where: { role: 'admin' },
            select: { id: true },
        });

        // If admin exists, you might want to require authentication
        // For now, we'll allow creation but you can add this check if needed

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Handle profile image upload
        let profileImage = 'frontend/img/default profile.png';
        if (profileFile && profileFile.size > 0) {
            try {
                profileImage = await uploadProfileImage(profileFile);
            } catch (error: any) {
                return NextResponse.json(
                    { success: false, error: error.message || 'Failed to upload profile image' },
                    { status: 400 }
                );
            }
        }

        // Create admin user
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                profileImage,
                role: 'admin',
                emailVerified: true, // Admin accounts are automatically verified
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Admin account created successfully.',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
            },
        });
    } catch (error: any) {
        console.error('Create admin error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

