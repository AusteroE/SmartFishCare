import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        // Get current user before clearing cookie
        const user = await getAuthUser();

        // Clear last seen timestamp if user exists
        if (user) {
            await prisma.user.update({
                where: { id: user.userId },
                data: { lastSeen: null },
            });
        }

        await clearAuthCookie();
        return NextResponse.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        // Even if update fails, still clear the cookie
        await clearAuthCookie();
        return NextResponse.json({ success: true, message: 'Logged out successfully' });
    }
}

