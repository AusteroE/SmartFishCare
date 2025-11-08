import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const adminCount = await prisma.user.count({
            where: { role: 'admin' },
        });

        return NextResponse.json({
            hasAdmin: adminCount > 0,
            count: adminCount,
        });
    } catch (error) {
        console.error('Check admin exists error:', error);
        return NextResponse.json(
            { hasAdmin: false, error: 'Failed to check admin existence' },
            { status: 500 }
        );
    }
}

