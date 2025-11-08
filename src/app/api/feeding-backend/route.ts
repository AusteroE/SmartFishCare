import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        if (action === 'get_feeding') {
            return getFeedingRecords(userId);
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Feeding API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const action = formData.get('action') as string;

        if (action === 'add_feeding') {
            return addFeedingRecord(userId, formData);
        } else if (action === 'delete_feeding') {
            return deleteFeedingRecord(userId, formData);
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Feeding API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message },
            { status: 500 }
        );
    }
}

async function addFeedingRecord(userId: number, formData: FormData) {
    const fish_size = formData.get('fish_size') as string;
    const food_type = formData.get('food_type') as string;
    const feeding_time = formData.get('feeding_time') as string;
    const quantity = formData.get('quantity') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!fish_size || !food_type || !feeding_time) {
        return NextResponse.json(
            { success: false, message: 'Please fill in Fish Size, Food Type, and Feeding Time' },
            { status: 400 }
        );
    }

    const allowedSizes = ['Small', 'Medium', 'Large'];
    if (!allowedSizes.includes(fish_size)) {
        return NextResponse.json(
            { success: false, message: 'Invalid fish size. Please select Small, Medium, or Large' },
            { status: 400 }
        );
    }

    const record = await prisma.feedingRecord.create({
        data: {
            userId,
            fishSize: fish_size,
            foodType: food_type,
            feedingTime: feeding_time,
            quantity: quantity || null,
            notes: notes || null,
        },
    });

    return NextResponse.json({
        success: true,
        message: 'Feeding record added successfully',
    });
}

async function getFeedingRecords(userId: number) {
    const records = await prisma.feedingRecord.findMany({
        where: { userId },
        orderBy: { feedingTime: 'asc' },
    });

    return NextResponse.json({
        success: true,
        data: records.map((r: any) => ({
            id: r.id,
            user_id: r.userId,
            fish_size: r.fishSize,
            food_type: r.foodType,
            feeding_time: r.feedingTime,
            quantity: r.quantity,
            notes: r.notes,
            created_at: r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            updated_at: r.updatedAt.toISOString().replace('T', ' ').slice(0, 19),
        })),
    });
}

async function deleteFeedingRecord(userId: number, formData: FormData) {
    const record_id = formData.get('record_id') as string;

    if (!record_id) {
        return NextResponse.json(
            { success: false, message: 'Record ID required' },
            { status: 400 }
        );
    }

    const deleted = await prisma.feedingRecord.deleteMany({
        where: {
            id: parseInt(record_id),
            userId,
        },
    });

    if (deleted.count === 0) {
        return NextResponse.json(
            { success: false, message: 'Record not found or access denied' },
            { status: 404 }
        );
    }

    return NextResponse.json({
        success: true,
        message: 'Feeding record deleted successfully',
    });
}

