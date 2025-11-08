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

        if (action === 'get_stocking') {
            return getStockingRecords(userId);
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Stocking API error:', error);
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

        if (action === 'add_stocking') {
            return addStockingRecord(userId, formData);
        } else if (action === 'delete_stocking') {
            return deleteStockingRecord(userId, formData);
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        console.error('Stocking API error:', error);
        return NextResponse.json(
            { success: false, message: 'Error: ' + error.message },
            { status: 500 }
        );
    }
}

async function addStockingRecord(userId: number, formData: FormData) {
    const fish_type = formData.get('fish_type') as string;
    const stock_date = formData.get('stock_date') as string;
    const aquarium_number = formData.get('aquarium_number') as string;
    const quantity = formData.get('quantity') as string | null;
    const notes = formData.get('notes') as string | null;

    if (!fish_type || !stock_date || !aquarium_number) {
        return NextResponse.json(
            { success: false, message: 'Required fields missing' },
            { status: 400 }
        );
    }

    const record = await prisma.stockingRecord.create({
        data: {
            userId,
            fishType: fish_type,
            stockDate: new Date(stock_date),
            aquariumNumber: aquarium_number,
            quantity: quantity ? parseInt(quantity) : null,
            notes: notes || null,
        },
    });

    return NextResponse.json({
        success: true,
        message: 'Stocking record added successfully',
    });
}

async function getStockingRecords(userId: number) {
    const records = await prisma.stockingRecord.findMany({
        where: { userId },
        orderBy: { stockDate: 'desc' },
    });

    return NextResponse.json({
        success: true,
        data: records.map((r: any) => ({
            id: r.id,
            user_id: r.userId,
            fish_type: r.fishType,
            stock_date: r.stockDate.toISOString().split('T')[0],
            aquarium_number: r.aquariumNumber,
            quantity: r.quantity,
            notes: r.notes,
            created_at: r.createdAt.toISOString().replace('T', ' ').slice(0, 19),
            updated_at: r.updatedAt.toISOString().replace('T', ' ').slice(0, 19),
        })),
    });
}

async function deleteStockingRecord(userId: number, formData: FormData) {
    const record_id = formData.get('record_id') as string;

    if (!record_id) {
        return NextResponse.json(
            { success: false, message: 'Record ID required' },
            { status: 400 }
        );
    }

    const deleted = await prisma.stockingRecord.deleteMany({
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
        message: 'Stocking record deleted successfully',
    });
}

