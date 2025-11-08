import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
    try {
        const parameters = await prisma.waterParameter.findMany({
            orderBy: { parameterName: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: parameters.map((param) => ({
                id: param.id,
                parameterName: param.parameterName,
                normalMin: param.normalMin,
                normalMax: param.normalMax,
                dangerMin: param.dangerMin,
                dangerMax: param.dangerMax,
                unit: param.unit,
            })),
        });
    } catch (error: any) {
        console.error('Error fetching water parameters:', error);
        return NextResponse.json(
            { success: false, message: 'Error fetching water parameters: ' + error.message },
            { status: 500 }
        );
    }
}

