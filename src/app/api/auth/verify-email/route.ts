import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.redirect(new URL('/?error=invalid_token', request.url));
        }

        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token,
            },
            select: {
                id: true,
                verificationExpires: true,
                emailVerified: true,
            },
        });

        if (!user) {
            return NextResponse.redirect(new URL('/?error=token_not_found', request.url));
        }

        if (user.emailVerified) {
            return NextResponse.redirect(new URL('/?error=already_verified', request.url));
        }

        // Check if token is expired
        if (!user.verificationExpires || new Date() > user.verificationExpires) {
            return NextResponse.redirect(new URL('/?error=token_expired', request.url));
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

        return NextResponse.redirect(new URL('/?verified=true', request.url));
    } catch (error: any) {
        console.error('Email verification error:', error);
        return NextResponse.redirect(new URL('/?error=verification_failed', request.url));
    }
}
