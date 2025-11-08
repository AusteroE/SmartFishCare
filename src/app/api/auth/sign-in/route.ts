import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
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
                password: true,
                role: true,
                emailVerified: true,
                email: true,
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Email not found' },
                { status: 401 }
            );
        }

        // Check if email is verified
        if (!user.emailVerified) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Please verify your email before logging in. Check your email for verification instructions.',
                },
                { status: 401 }
            );
        }

        // Verify password
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) {
            return NextResponse.json(
                { success: false, error: 'Incorrect password' },
                { status: 401 }
            );
        }

        // Generate token and set cookie
        const token = generateToken({
            userId: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
        });

        await setAuthCookie(token);

        // Update last seen timestamp
        await prisma.user.update({
            where: { id: user.id },
            data: { lastSeen: new Date() },
        });

        // Determine redirect URL based on role
        const redirectUrl =
            user.role === 'admin' ? '/admin/dashboard' : '/dashboard';

        return NextResponse.json({
            success: true,
            role: user.role,
            redirect_url: redirectUrl,
        });
    } catch (error: any) {
        console.error('Sign-in error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
