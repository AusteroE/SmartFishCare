import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateVerificationToken } from '@/lib/email';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
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

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                username: true,
                email: true,
            },
        });

        // Always return success to prevent email enumeration
        // But only send email if user exists
        if (user) {
            // Generate reset token
            const resetToken = generateVerificationToken();
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour

            // Update user with reset token
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    verificationToken: resetToken,
                    verificationExpires: expiresAt,
                },
            });

            // Log the password reset request
            await prisma.emailVerificationLog.create({
                data: {
                    userId: user.id,
                    email: user.email,
                    verificationType: 'password_reset',
                    token: resetToken,
                    expiresAt: expiresAt,
                    used: false,
                },
            });

            // Send password reset email
            await sendPasswordResetEmail(user.email, user.username, resetToken);
        }

        // Always return success message to prevent email enumeration
        return NextResponse.json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.',
        });
    } catch (error: any) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

