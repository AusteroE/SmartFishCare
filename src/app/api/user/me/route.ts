import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userData = await prisma.user.findUnique({
            where: { id: user.userId },
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                phoneNumber: true,
                role: true,
            },
        });

        if (!userData) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        // Allow both 'user' and 'admin' roles to access their own data
        // Admins can access regular dashboard features too

        return NextResponse.json({
            success: true,
            user: {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                profile_image: userData.profileImage,
                phone_number: userData.phoneNumber,
                role: userData.role,
            },
        });
    } catch (error: any) {
        console.error('Get user error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}
