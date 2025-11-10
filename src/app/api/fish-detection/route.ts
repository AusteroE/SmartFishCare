import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { length, width, category, confidence } = body;

        if (!length || !width || !category) {
            return NextResponse.json(
                { success: false, message: 'Missing required fields: length, width, category' },
                { status: 400 }
            );
        }

        // Validate category
        const validCategories = ['Small', 'Medium', 'Large'];
        if (!validCategories.includes(category)) {
            return NextResponse.json(
                { success: false, message: 'Invalid category. Must be Small, Medium, or Large' },
                { status: 400 }
            );
        }

        // Convert confidence from percentage (0-100) to decimal (0-1) if needed
        let confidenceDecimal: number | null = null;
        if (confidence !== null && confidence !== undefined) {
            const confValue = parseFloat(confidence.toString());
            // If confidence is > 1, it's a percentage (0-100), convert to decimal (0-1)
            // If confidence is <= 1, it's already a decimal (0-1)
            confidenceDecimal = confValue > 1 ? confValue / 100 : confValue;
            // Ensure it's between 0 and 1
            confidenceDecimal = Math.max(0, Math.min(1, confidenceDecimal));
        }

        // For large fish, check if we already have a detection today (limit: one per day)
        if (category === 'Large') {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Start of today (00:00:00)
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1); // Start of tomorrow (00:00:00)

            const existingLargeFish = await prisma.fishDetection.findFirst({
                where: {
                    userId: userId,
                    sizeCategory: 'Large',
                    detectionTimestamp: {
                        gte: today,
                        lt: tomorrow,
                    },
                },
                orderBy: {
                    detectionTimestamp: 'desc',
                },
            });

            if (existingLargeFish) {
                // Update the existing record with the latest detection data
                const updated = await prisma.fishDetection.update({
                    where: { id: existingLargeFish.id },
                    data: {
                        detectedLength: parseFloat(length.toString()),
                        detectedWidth: parseFloat(width.toString()),
                        confidenceScore: confidenceDecimal,
                        detectionTimestamp: new Date(), // Update timestamp to latest detection time
                    },
                });

                return NextResponse.json({
                    success: true,
                    message: 'Large fish detection updated (one per day limit)',
                    data: updated,
                    updated: true,
                });
            }
        }

        // For non-large fish or if no large fish exists today, create new record
        const detection = await prisma.fishDetection.create({
            data: {
                userId: userId,
                detectedLength: parseFloat(length.toString()),
                detectedWidth: parseFloat(width.toString()),
                sizeCategory: category,
                confidenceScore: confidenceDecimal,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Detection recorded successfully',
            data: detection,
        });
    } catch (error: any) {
        console.error('Fish detection error:', error);
        return NextResponse.json(
            { success: false, message: 'Error recording detection: ' + error.message },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const category = searchParams.get('category');

        const where: any = { userId: userId };
        if (category) {
            where.sizeCategory = category;
        }

        const detections = await prisma.fishDetection.findMany({
            where,
            orderBy: { detectionTimestamp: 'desc' },
            take: limit,
        });

        return NextResponse.json({
            success: true,
            count: detections.length,
            data: detections,
        });
    } catch (error: any) {
        console.error('Get detections error:', error);
        return NextResponse.json(
            { success: false, message: 'Error fetching detections: ' + error.message },
            { status: 500 }
        );
    }
}

