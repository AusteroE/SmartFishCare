import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const user = await getAuthUser();

        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is admin
        if (user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden - Admin access required' }, { status: 403 });
        }

        // Fetch user statistics
        const totalUsers = await prisma.user.count();
        const adminCount = await prisma.user.count({ where: { role: 'admin' } });
        const regularUserCount = await prisma.user.count({ where: { role: 'user' } });

        // Fetch all users
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                email: true,
                profileImage: true,
                role: true,
                emailVerified: true,
                lastSeen: true,
                createdAt: true,
            },
            orderBy: {
                id: 'desc',
            },
        });

        // Calculate online status (users seen within last 5 minutes are online)
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        return NextResponse.json({
            success: true,
            stats: {
                total: totalUsers,
                admins: adminCount,
                users: regularUserCount,
            },
            users: users.map(user => {
                const isOnline = user.lastSeen && new Date(user.lastSeen) > fiveMinutesAgo;
                return {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    profile_image: user.profileImage,
                    role: user.role,
                    email_verified: user.emailVerified,
                    last_seen: user.lastSeen,
                    created_at: user.createdAt,
                    status: user.emailVerified ? 'active' : 'pending', // Account status based on email verification
                    is_online: isOnline, // Online/offline status
                };
            }),
        });
    } catch (error: any) {
        console.error('Admin users fetch error:', error);
        return NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
        );
    }
}

