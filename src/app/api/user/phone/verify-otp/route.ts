import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { phoneNumber, otp } = body;

        if (!phoneNumber || !otp) {
            return NextResponse.json(
                { success: false, error: 'Phone number and OTP are required' },
                { status: 400 }
            );
        }

        // Get user data
        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                otpCode: true,
                otpExpires: true,
            },
        });

        if (!userData) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Check if OTP exists and is in correct format
        if (!userData.otpCode || !userData.otpCode.startsWith('PHONE:')) {
            return NextResponse.json(
                { success: false, error: 'No OTP found. Please request a new one.' },
                { status: 400 }
            );
        }

        // Parse phone number and OTP from stored format: "PHONE:{phoneNumber}:{otp}"
        const parts = userData.otpCode.split(':');
        if (parts.length !== 3) {
            return NextResponse.json(
                { success: false, error: 'Invalid OTP format. Please request a new one.' },
                { status: 400 }
            );
        }

        const storedPhoneNumber = parts[1];
        const storedOtp = parts[2];

        // Verify phone number matches
        if (storedPhoneNumber !== phoneNumber.trim()) {
            return NextResponse.json(
                { success: false, error: 'Phone number mismatch. Please request a new OTP.' },
                { status: 400 }
            );
        }

        // Check if OTP is expired
        if (!userData.otpExpires || new Date() > userData.otpExpires) {
            // Clear expired OTP
            await prisma.user.update({
                where: { id: user.userId },
                data: {
                    otpCode: null,
                    otpExpires: null,
                },
            });
            return NextResponse.json(
                { success: false, error: 'OTP has expired. Please request a new one.' },
                { status: 400 }
            );
        }

        // Verify OTP
        if (storedOtp !== otp) {
            return NextResponse.json(
                { success: false, error: 'Invalid OTP code' },
                { status: 401 }
            );
        }

        // OTP is valid - update user's phone number and clear OTP
        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: {
                phoneNumber: phoneNumber.trim(),
                otpCode: null,
                otpExpires: null,
            },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                role: true,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Phone number verified and updated successfully',
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                profile_image: updatedUser.profileImage,
                phone_number: updatedUser.phoneNumber,
                role: updatedUser.role,
            },
        });
    } catch (error: any) {
        console.error('Verify phone OTP error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

