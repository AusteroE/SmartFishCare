import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { phoneNumber } = body;

        if (!phoneNumber) {
            return NextResponse.json(
                { success: false, error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Validate phone number format
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        if (!phoneRegex.test(phoneNumber.trim())) {
            return NextResponse.json(
                { success: false, error: 'Invalid phone number format. Use international format (e.g., +639123456789)' },
                { status: 400 }
            );
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in user's otpCode field temporarily
        // We'll use a special format: "PHONE:{phoneNumber}:{otp}" to distinguish from email OTP
        await prisma.user.update({
            where: { id: user.userId },
            data: {
                otpCode: `PHONE:${phoneNumber}:${otp}`,
                otpExpires: expiresAt,
            },
        });

        // Send OTP via SMS using Semaphore API
        const apiKey = process.env.SEMAPHORE_API_KEY;
        const senderName = process.env.SEMAPHORE_SENDER_NAME || 'SmartFish';

        if (!apiKey) {
            return NextResponse.json(
                { success: false, error: 'SMS service not configured. Please contact administrator.' },
                { status: 500 }
            );
        }

        const smsMessage = `Your SmartFish verification code is: ${otp}. Valid for 10 minutes.`;

        // Send SMS via Semaphore API
        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('number', phoneNumber.trim());
        formData.append('message', smsMessage);
        formData.append('sendername', senderName);

        const smsResponse = await fetch('https://api.semaphore.co/api/v4/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const smsData = await smsResponse.json();

        if (!smsResponse.ok) {
            console.error('Semaphore API error:', smsData);
            // Clear OTP if SMS failed
            await prisma.user.update({
                where: { id: user.userId },
                data: {
                    otpCode: null,
                    otpExpires: null,
                },
            });
            return NextResponse.json(
                { success: false, error: 'Failed to send SMS. Please check your phone number and try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'OTP sent successfully to your phone number',
        });
    } catch (error: any) {
        console.error('Send phone OTP error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

