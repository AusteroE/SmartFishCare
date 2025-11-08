import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, otp } = body;

        if (!email || !otp) {
            return NextResponse.json(
                { success: false, error: 'Email and OTP are required' },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                otpCode: true,
                otpExpires: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Email not found' },
                { status: 404 }
            );
        }

        if (user.emailVerified) {
            return NextResponse.json(
                { success: false, error: 'Email is already verified' },
                { status: 400 }
            );
        }

        // Check if OTP is expired
        if (!user.otpExpires || new Date() > user.otpExpires) {
            return NextResponse.json(
                { success: false, error: 'OTP has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Verify OTP
        if (user.otpCode !== otp) {
            return NextResponse.json(
                { success: false, error: 'Invalid OTP code' },
                { status: 401 }
            );
        }

        // Update user to verified
        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                verificationToken: null,
                otpCode: null,
                otpExpires: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Email verified successfully. You can now log in.',
        });
    } catch (error: any) {
        console.error('OTP verification error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
