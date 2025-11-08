import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const ranges = await prisma.fishSizeRange.findMany({
            orderBy: { minLength: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: ranges.map((range) => ({
                id: range.id,
                category: range.category,
                minLength: range.minLength,
                maxLength: range.maxLength,
                minWidth: range.minWidth,
                maxWidth: range.maxWidth,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching fish ranges:', error);
        return NextResponse.json(
            { success: false, message: 'Error fetching fish ranges: ' + error.message },
            { status: 500 }
        );
    }
}

