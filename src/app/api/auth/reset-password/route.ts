import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token, password } = body;

        if (!token || !password) {
            return NextResponse.json(
                { success: false, error: 'Token and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { success: false, error: 'Password must be at least 6 characters long' },
                { status: 400 }
            );
        }

        // Find user by reset token
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
                verificationExpires: {
                    gt: new Date(), // Token must not be expired
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid or expired reset token' },
                { status: 400 }
            );
        }

        // Check if token has been used
        const verificationLog = await prisma.emailVerificationLog.findFirst({
            where: {
                userId: user.id,
                token: token,
                verificationType: 'password_reset',
                used: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        if (!verificationLog || verificationLog.used) {
            return NextResponse.json(
                { success: false, error: 'This reset token has already been used' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user password and clear reset token
        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                verificationToken: null,
                verificationExpires: null,
            },
        });

        // Mark verification log as used
        await prisma.emailVerificationLog.update({
            where: { id: verificationLog.id },
            data: { used: true },
        });

        return NextResponse.json({
            success: true,
            message: 'Password has been reset successfully. You can now sign in with your new password.',
        });
    } catch (error: any) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

