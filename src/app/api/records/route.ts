import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

// GET - Fetch records based on action parameter
export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action');

        switch (action) {
            case 'get_fish_ranges':
                return getFishRanges();
            case 'get_water_params':
                return getWaterParams();
            case 'get_feeding':
                return getFeedingRecords(userId);
            default:
                return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Records API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message },
            { status: 500 }
        );
    }
}

// POST - Add/Delete records based on action parameter
export async function POST(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const action = body.action;

        switch (action) {
            case 'add_feeding':
                return addFeedingRecord(userId, body);
            case 'delete_feeding':
                return deleteFeedingRecord(userId, body);
            default:
                return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Records API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message },
            { status: 500 }
        );
    }
}

// Helper functions
async function getFishRanges() {
    const ranges = await prisma.fishSizeRange.findMany({
        orderBy: { minLength: 'asc' },
    });

    return NextResponse.json({
        success: true,
        data: ranges.map((range: any) => ({
            id: range.id,
            category: range.category,
            min_length: Number(range.minLength),
            max_length: range.maxLength ? Number(range.maxLength) : null,
            min_width: Number(range.minWidth),
            max_width: range.maxWidth ? Number(range.maxWidth) : null,
            created_at: range.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            updated_at: range.updatedAt.toISOString().replace('T', ' ').slice(0, 19),
        })),
    });
}

async function getWaterParams() {
    const params = await prisma.waterParameter.findMany({
        orderBy: { parameterName: 'asc' },
    });

    return NextResponse.json({
        success: true,
        data: params.map((param: any) => ({
            id: param.id,
            parameter_name: param.parameterName,
            normal_min: Number(param.normalMin),
            normal_max: Number(param.normalMax),
            danger_min: param.dangerMin ? Number(param.dangerMin) : null,
            danger_max: param.dangerMax ? Number(param.dangerMax) : null,
            unit: param.unit,
            created_at: param.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            updated_at: param.updatedAt.toISOString().replace('T', ' ').slice(0, 19),
        })),
    });
}

async function addFeedingRecord(userId: number, body: any) {
    const { fish_size, food_type, feeding_time, quantity, notes } = body;

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
            feedingTime: feeding_time, // Store as string (HH:MM:SS format)
            quantity: quantity || null,
            notes: notes || null,
        },
    });

    return NextResponse.json({
        success: true,
        message: 'Feeding record added successfully',
        data: record,
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

async function deleteFeedingRecord(userId: number, body: any) {
    const { record_id } = body;

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

