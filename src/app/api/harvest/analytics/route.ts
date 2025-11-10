import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'week'; // day, week, month, year

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        let groupBy: 'day' | 'week' | 'month' | 'year';

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7); // Last 7 days
                groupBy = 'day';
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30); // Last 30 days (4-5 weeks)
                groupBy = 'week';
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
                groupBy = 'month';
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 5); // Last 5 years
                groupBy = 'year';
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                groupBy = 'week';
        }

        console.log(`[Harvest Analytics] Fetching data for userId: ${userId}, period: ${period}`);
        console.log(`[Harvest Analytics] Date range: ${startDate.toISOString()} to ${now.toISOString()}`);

        // First, check if user has any large fish detections at all
        const totalLargeFishCount = await prisma.fishDetection.count({
            where: {
                userId: userId,
                sizeCategory: 'Large',
            },
        });
        console.log(`[Harvest Analytics] User has ${totalLargeFishCount} total large fish detections (all time)`);

        // Also check all users' large fish count for debugging (to verify data exists in DB)
        const allUsersLargeFishCount = await prisma.fishDetection.count({
            where: {
                sizeCategory: 'Large',
            },
        });
        console.log(`[Harvest Analytics] Total large fish detections in database (all users): ${allUsersLargeFishCount}`);

        // Get sample of all large fish (any user) to see what data exists
        if (allUsersLargeFishCount > 0 && totalLargeFishCount === 0) {
            const sampleRecords = await prisma.fishDetection.findMany({
                where: {
                    sizeCategory: 'Large',
                },
                take: 3,
                select: {
                    id: true,
                    userId: true,
                    detectedLength: true,
                    detectedWidth: true,
                    detectionTimestamp: true,
                },
            });
            console.log(`[Harvest Analytics] Sample large fish records (any user):`, sampleRecords.map(r => ({
                id: r.id,
                userId: r.userId,
                date: r.detectionTimestamp.toISOString(),
                length: r.detectedLength,
                width: r.detectedWidth,
            })));
            console.log(`[Harvest Analytics] WARNING: Current user (${userId}) has no large fish, but other users do. Check if you're logged in as the correct user.`);
        }

        // Fetch large fish detections (ready to harvest) within the date range
        let fishDetections = await prisma.fishDetection.findMany({
            where: {
                userId: userId,
                sizeCategory: 'Large', // Only large fish ready to harvest
                detectionTimestamp: {
                    gte: startDate,
                    lte: now,
                },
            },
            orderBy: {
                detectionTimestamp: 'asc',
            },
        });

        console.log(`[Harvest Analytics] Found ${fishDetections.length} large fish detections in date range`);

        // If no data in date range but user has data, fetch all large fish data
        // This ensures the analytics page shows data even if it's outside the selected period
        if (fishDetections.length === 0 && totalLargeFishCount > 0) {
            console.log(`[Harvest Analytics] No data in date range, fetching all large fish detections for user`);

            // Get the latest detection to check its date
            const latestDetection = await prisma.fishDetection.findFirst({
                where: {
                    userId: userId,
                    sizeCategory: 'Large',
                },
                orderBy: {
                    detectionTimestamp: 'desc',
                },
                select: {
                    detectionTimestamp: true,
                    detectedLength: true,
                    detectedWidth: true,
                },
            });

            if (latestDetection) {
                console.log(`[Harvest Analytics] Latest detection date: ${latestDetection.detectionTimestamp.toISOString()}`);
                console.log(`[Harvest Analytics] Selected date range start: ${startDate.toISOString()}`);
                console.log(`[Harvest Analytics] Current date: ${now.toISOString()}`);

                // Fetch ALL large fish data for this user (regardless of date range)
                // This ensures data is always shown if it exists
                fishDetections = await prisma.fishDetection.findMany({
                    where: {
                        userId: userId,
                        sizeCategory: 'Large',
                    },
                    orderBy: {
                        detectionTimestamp: 'asc',
                    },
                    take: 1000, // Limit to prevent huge responses
                });
                console.log(`[Harvest Analytics] Fetched ${fishDetections.length} total large fish detections (all time, ignoring date range)`);
            }
        }

        // Additional check: If still no data, verify the query is working
        if (fishDetections.length === 0) {
            console.log(`[Harvest Analytics] Still no data found. Checking query parameters...`);
            console.log(`[Harvest Analytics] Query params: userId=${userId}, sizeCategory='Large', dateRange=${startDate.toISOString()} to ${now.toISOString()}`);

            // Try a simpler query without date restrictions to verify data exists
            const testQuery = await prisma.fishDetection.findMany({
                where: {
                    userId: userId,
                    sizeCategory: 'Large',
                },
                take: 5,
            });
            console.log(`[Harvest Analytics] Test query (no date filter) found ${testQuery.length} records`);
            if (testQuery.length > 0) {
                console.log(`[Harvest Analytics] Sample record dates:`, testQuery.map(d => ({
                    id: d.id,
                    date: d.detectionTimestamp.toISOString(),
                    length: d.detectedLength,
                    width: d.detectedWidth,
                })));
            }
        }

        // Also check if there are any fish detections at all (any size) for debugging
        const allFishCount = await prisma.fishDetection.count({
            where: {
                userId: userId,
            },
        });
        console.log(`[Harvest Analytics] User has ${allFishCount} total fish detections (all sizes, all time)`);

        // Group data by period
        const groupedData: { [key: string]: { date: string; count: number; avgLength: number; avgWidth: number; totalLength: number; totalWidth: number } } = {};

        fishDetections.forEach((detection) => {
            const date = new Date(detection.detectionTimestamp);
            let key: string;

            switch (groupBy) {
                case 'day':
                    key = date.toISOString().split('T')[0]; // YYYY-MM-DD
                    break;
                case 'week':
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
                    key = weekStart.toISOString().split('T')[0];
                    break;
                case 'month':
                    key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
                    break;
                case 'year':
                    key = String(date.getFullYear()); // YYYY
                    break;
                default:
                    key = date.toISOString().split('T')[0];
            }

            if (!groupedData[key]) {
                groupedData[key] = {
                    date: key,
                    count: 0,
                    avgLength: 0,
                    avgWidth: 0,
                    totalLength: 0,
                    totalWidth: 0,
                };
            }

            const length = Number(detection.detectedLength);
            const width = Number(detection.detectedWidth);

            groupedData[key].count += 1;
            groupedData[key].totalLength += length;
            groupedData[key].totalWidth += width;
        });

        // Calculate averages and convert to array
        const chartData = Object.values(groupedData)
            .map((item) => ({
                date: formatDateLabel(item.date, groupBy),
                count: item.count,
                avgLength: item.count > 0 ? Number((item.totalLength / item.count).toFixed(2)) : 0,
                avgWidth: item.count > 0 ? Number((item.totalWidth / item.count).toFixed(2)) : 0,
                totalLength: Number(item.totalLength.toFixed(2)),
                totalWidth: Number(item.totalWidth.toFixed(2)),
                rawDate: item.date,
            }))
            .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

        // Calculate totals
        const totalCount = fishDetections.length;
        const avgLength = totalCount > 0
            ? Number((fishDetections.reduce((sum, d) => sum + Number(d.detectedLength), 0) / totalCount).toFixed(2))
            : 0;
        const avgWidth = totalCount > 0
            ? Number((fishDetections.reduce((sum, d) => sum + Number(d.detectedWidth), 0) / totalCount).toFixed(2))
            : 0;

        const totals = {
            totalCount: totalCount,
            avgLength: avgLength,
            avgWidth: avgWidth,
            totalRecords: fishDetections.length,
        };

        console.log(`[Harvest Analytics] Returning data: ${chartData.length} chart points, ${totals.totalCount} total records`);

        return NextResponse.json({
            success: true,
            period,
            data: chartData,
            totals,
            rawRecords: fishDetections.slice(0, 100), // Limit raw records to prevent large response
            dateRange: {
                start: startDate.toISOString(),
                end: now.toISOString(),
            },
            debug: {
                totalLargeFishCount: totalLargeFishCount,
                allFishCount: allFishCount,
                foundInRange: fishDetections.length,
                userId: userId,
                usingAllData: fishDetections.length > 0 && (fishDetections[0]?.detectionTimestamp < startDate || fishDetections[fishDetections.length - 1]?.detectionTimestamp > now),
            },
        });
    } catch (error: any) {
        console.error('[Harvest Analytics] Error:', error);
        console.error('[Harvest Analytics] Error details:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
        });
        return NextResponse.json(
            {
                success: false,
                message: 'Error fetching analytics: ' + (error.message || 'Unknown error'),
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            },
            { status: 500 }
        );
    }
}

function formatDateLabel(dateStr: string, groupBy: 'day' | 'week' | 'month' | 'year'): string {
    if (groupBy === 'day') {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (groupBy === 'week') {
        const date = new Date(dateStr);
        const weekEnd = new Date(date);
        weekEnd.setDate(date.getDate() + 6);
        return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    } else if (groupBy === 'month') {
        const [year, month] = dateStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } else {
        return dateStr;
    }
}

