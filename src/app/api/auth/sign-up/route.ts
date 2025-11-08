import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateVerificationToken, generateOTP, sendVerificationEmail } from '@/lib/email';
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

        // Generate verification token and OTP
        const verificationToken = generateVerificationToken();
        const otpCode = generateOTP();
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000);

        // Insert user into database using Prisma
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                profileImage,
                role: 'user',
                verificationToken,
                verificationExpires,
                otpCode,
                otpExpires,
                emailVerified: false,
            },
        });

        // Send verification email
        const emailSent = await sendVerificationEmail(email, username, verificationToken, otpCode);

        if (emailSent) {
            // Log verification attempt
            await prisma.emailVerificationLog.create({
                data: {
                    userId: user.id,
                    email,
                    verificationType: 'signup',
                    token: verificationToken,
                    otpCode,
                    expiresAt: verificationExpires,
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: 'Account created successfully. Please verify your email.',
            email: email,
        });
    } catch (error: any) {
        console.error('Sign-up error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
