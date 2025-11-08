import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Update last seen timestamp
        await prisma.user.update({
            where: { id: user.userId },
            data: { lastSeen: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Keep-alive error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

