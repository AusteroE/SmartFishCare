import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const userId = await verifyAuth(request);
        if (!userId) {
            return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
        }

        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, message: 'User not found' }, { status: 404 });
        }

        // Get period from query params
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'week';

        // Calculate date range based on period
        const now = new Date();
        let startDate: Date;
        let periodLabel: string;

        switch (period) {
            case 'day':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                periodLabel = 'Last 7 Days';
                break;
            case 'week':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                periodLabel = 'Last 30 Days (Weekly)';
                break;
            case 'month':
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 12);
                periodLabel = 'Last 12 Months';
                break;
            case 'year':
                startDate = new Date(now);
                startDate.setFullYear(startDate.getFullYear() - 5);
                periodLabel = 'Last 5 Years';
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                periodLabel = 'Last 30 Days';
        }

        // Fetch large fish detections (ready to harvest)
        const fishDetections = await prisma.fishDetection.findMany({
            where: {
                userId: userId,
                sizeCategory: 'Large', // Only large fish ready to harvest
                detectionTimestamp: {
                    gte: startDate,
                    lte: now,
                },
            },
            orderBy: {
                detectionTimestamp: 'desc',
            },
        });

        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        // Calculate totals
        const totalCount = fishDetections.length;
        const avgLength = totalCount > 0
            ? Number((fishDetections.reduce((sum, d) => sum + Number(d.detectedLength), 0) / totalCount).toFixed(2))
            : 0;
        const avgWidth = totalCount > 0
            ? Number((fishDetections.reduce((sum, d) => sum + Number(d.detectedWidth), 0) / totalCount).toFixed(2))
            : 0;

        // Generate HTML report
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Harvest Report</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #333;
        }
        .header {
            margin-bottom: 30px;
            border-bottom: 2px solid #0e4d92;
            padding-bottom: 20px;
        }
        .logo-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
        }
        .logo-left {
            max-width: 150px;
            height: auto;
            flex-shrink: 0;
        }
        .logo-right {
            max-width: 150px;
            height: auto;
            flex-shrink: 0;
        }
        .logo-right-img {
            max-width: 100%;
            height: auto;
            object-fit: contain;
        }
        .header-center {
            text-align: center;
            flex-grow: 1;
            padding: 0 20px;
        }
        .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #0e4d92;
            margin: 10px 0;
        }
        .user-info {
            font-size: 14px;
            color: #666;
            margin: 5px 0;
        }
        .section {
            margin: 30px 0;
            page-break-inside: avoid;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #0e4d92;
            margin-bottom: 15px;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
        }
        .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }
        .summary-item {
            flex: 1;
            min-width: 150px;
            padding: 15px;
            background-color: #f5f5f5;
            border-radius: 5px;
            text-align: center;
        }
        .summary-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #0e4d92;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
            overflow-wrap: break-word;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
            text-align: center;
        }
        td {
            text-align: center;
        }
        .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
        }
        .harvest-table th:nth-child(1),
        .harvest-table td:nth-child(1) { width: 20%; }
        .harvest-table th:nth-child(2),
        .harvest-table td:nth-child(2) { width: 20%; }
        .harvest-table th:nth-child(3),
        .harvest-table td:nth-child(3) { width: 20%; }
        .harvest-table th:nth-child(4),
        .harvest-table td:nth-child(4) { width: 20%; }
        .harvest-table th:nth-child(5),
        .harvest-table td:nth-child(5) { width: 20%; }
        @media print {
            body { margin: 0; }
            .no-print { display: none; }
            .logo-container { page-break-inside: avoid; }
            .logo-left, .logo-right, .logo-right-img { max-width: 120px; }
        }
        @media screen and (max-width: 768px) {
            .logo-container { flex-direction: column; gap: 15px; }
            .header-center { padding: 0; }
            .logo-left, .logo-right, .logo-right-img { max-width: 100px; }
            .summary { flex-direction: column; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-container">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/smartfishcarelogo.png" alt="Smart Fish Care Logo" class="logo-left" onerror="this.style.display='none'">
            <div class="header-center">
                <div class="report-title">Harvest Report</div>
                <div class="user-info">Generated for: ${escapeHtml(user.username)} (${escapeHtml(user.email)})</div>
                <div class="user-info">Period: ${periodLabel}</div>
                <div class="user-info">Generated on: ${timestamp}</div>
            </div>
            <div class="logo-right">
                <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/frontend/img/print_logo.jpg" alt="USTP Logo" class="logo-right-img" onerror="this.style.display='none'">
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Summary</div>
        <div class="summary">
            <div class="summary-item">
                <div class="summary-label">Total Large Fish</div>
                <div class="summary-value">${totalCount}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Avg Length (cm)</div>
                <div class="summary-value">${avgLength.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Avg Width (cm)</div>
                <div class="summary-value">${avgWidth.toFixed(2)}</div>
            </div>
            <div class="summary-item">
                <div class="summary-label">Total Records</div>
                <div class="summary-value">${fishDetections.length}</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Large Fish Ready to Harvest</div>
        ${fishDetections.length > 0 ? `
            <table class="harvest-table">
                <thead>
                    <tr>
                        <th>Detection Date</th>
                        <th>Length (cm)</th>
                        <th>Width (cm)</th>
                        <th>Size Category</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${fishDetections.map(detection => `
                        <tr>
                            <td>${formatDate(detection.detectionTimestamp)}</td>
                            <td>${Number(detection.detectedLength).toFixed(2)}</td>
                            <td>${Number(detection.detectedWidth).toFixed(2)}</td>
                            <td>${escapeHtml(detection.sizeCategory)}</td>
                            <td>${detection.confidenceScore ? (Number(detection.confidenceScore) * 100).toFixed(1) + '%' : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="no-data">No large fish detection records found for the selected period.</div>'}
    </div>
    
    <div class="no-print" style="text-align: center; margin-top: 30px;">
        <button onclick="window.print()" style="background: #0e4d92; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer; font-size: 16px;">
            Print as PDF
        </button>
    </div>
    
    <script>
        // Auto-print when page loads
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 1000);
        };
    </script>
</body>
</html>`;

        // Return HTML content that opens in new window and auto-prints
        return new NextResponse(htmlContent, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Content-Disposition': 'inline; filename="harvest-report.html"',
            },
        });
    } catch (error: any) {
        console.error('PDF export error:', error);
        return NextResponse.json(
            { success: false, message: 'Error generating PDF: ' + error.message },
            { status: 500 }
        );
    }
}

function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

