import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

const SEMAPHORE_API_URL = 'https://api.semaphore.co/api/v4/messages';
const SMS_THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

// Store last SMS send time per user (in-memory cache)
// In production, consider using Redis or database
const lastSmsSent: Map<number, number> = new Map();

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        let { message, phoneNumber } = body;

        // If phone number not provided, try to get from user profile
        if (!phoneNumber) {
            try {
                // Get user from database to fetch phone number
                const userData = await prisma.user.findUnique({
                    where: { id: userId },
                    select: { phoneNumber: true },
                });

                if (userData?.phoneNumber) {
                    phoneNumber = userData.phoneNumber;
                } else {
                    // Fallback to environment variable
                    phoneNumber = process.env.DEFAULT_PHONE_NUMBER;

                    if (!phoneNumber) {
                        return NextResponse.json(
                            { success: false, message: 'Phone number required. Please configure phone number in your profile settings or provide it in the request.' },
                            { status: 400 }
                        );
                    }
                }
            } catch (error) {
                console.error('Error fetching user phone number:', error);
                // Fallback to environment variable
                phoneNumber = process.env.DEFAULT_PHONE_NUMBER;

                if (!phoneNumber) {
                    return NextResponse.json(
                        { success: false, message: 'Phone number required. Please configure phone number in your profile settings.' },
                        { status: 400 }
                    );
                }
            }
        }

        if (!message) {
            return NextResponse.json(
                { success: false, message: 'Missing required field: message' },
                { status: 400 }
            );
        }

        // Check throttle (2 minutes)
        const lastSent = lastSmsSent.get(userId);
        const now = Date.now();
        if (lastSent && (now - lastSent) < SMS_THROTTLE_MS) {
            const remainingSeconds = Math.ceil((SMS_THROTTLE_MS - (now - lastSent)) / 1000);
            return NextResponse.json(
                {
                    success: false,
                    message: `SMS throttle active. Please wait ${remainingSeconds} seconds before sending another SMS.`
                },
                { status: 429 }
            );
        }

        // Limit message to 50 characters
        const truncatedMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;

        // Get Semaphore API key and sender name from environment
        const apiKey = process.env.SEMAPHORE_API_KEY;
        const senderName = process.env.SEMAPHORE_SENDER_NAME || 'SmartFish';

        if (!apiKey) {
            console.error('SEMAPHORE_API_KEY not configured');
            return NextResponse.json(
                { success: false, message: 'SMS service not configured' },
                { status: 500 }
            );
        }

        // Send SMS via Semaphore API
        const formData = new URLSearchParams();
        formData.append('apikey', apiKey);
        formData.append('number', phoneNumber);
        formData.append('message', truncatedMessage);
        formData.append('sendername', senderName);

        const smsResponse = await fetch(SEMAPHORE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        const smsData = await smsResponse.json();

        if (!smsResponse.ok) {
            console.error('Semaphore API error:', smsData);
            return NextResponse.json(
                { success: false, message: 'Failed to send SMS: ' + (smsData.message || 'Unknown error') },
                { status: 500 }
            );
        }

        // Update throttle timestamp
        lastSmsSent.set(userId, now);

        return NextResponse.json({
            success: true,
            message: 'SMS sent successfully',
            data: {
                message: truncatedMessage,
                phoneNumber: phoneNumber,
            },
        });
    } catch (error: any) {
        console.error('SMS send error:', error);
        return NextResponse.json(
            { success: false, message: 'Error sending SMS: ' + error.message },
            { status: 500 }
        );
    }
}
