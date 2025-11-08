import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// Test route to insert sample sensor data
export async function POST(request: NextRequest) {
    try {
        // Insert test data
        await prisma.sensorData.create({
            data: {
                ph: 7.2,
                temperature: 25.5,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Test sensor data inserted successfully',
        });
    } catch (error: any) {
        console.error('Test data insert error:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

