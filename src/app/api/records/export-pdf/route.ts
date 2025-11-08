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

        // Fetch all records data
        const [stockingRecords, harvestRecords, feedingRecords] = await Promise.all([
            prisma.stockingRecord.findMany({ where: { userId }, orderBy: { stockDate: 'desc' } }),
            prisma.harvestRecord.findMany({ where: { userId }, orderBy: { harvestDate: 'desc' } }),
            prisma.feedingRecord.findMany({ where: { userId }, orderBy: { feedingTime: 'asc' } }),
        ]);

        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });

        // Generate HTML report matching PHP version
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fish Care Records Report</title>
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
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            word-wrap: break-word;
            word-break: break-word;
            white-space: normal;
            overflow-wrap: break-word;
        }
        th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .no-data {
            text-align: center;
            color: #666;
            font-style: italic;
            padding: 20px;
        }
        .stocking-table th:nth-child(1),
        .stocking-table td:nth-child(1) { width: 25%; }
        .stocking-table th:nth-child(2),
        .stocking-table td:nth-child(2) { width: 20%; }
        .stocking-table th:nth-child(3),
        .stocking-table td:nth-child(3) { width: 20%; }
        .stocking-table th:nth-child(4),
        .stocking-table td:nth-child(4) { width: 15%; }
        .stocking-table th:nth-child(5),
        .stocking-table td:nth-child(5) { width: 20%; }
        .harvest-table th:nth-child(1),
        .harvest-table td:nth-child(1) { width: 20%; }
        .harvest-table th:nth-child(2),
        .harvest-table td:nth-child(2) { width: 10%; }
        .harvest-table th:nth-child(3),
        .harvest-table td:nth-child(3) { width: 15%; }
        .harvest-table th:nth-child(4),
        .harvest-table td:nth-child(4) { width: 20%; }
        .harvest-table th:nth-child(5),
        .harvest-table td:nth-child(5) { width: 15%; }
        .harvest-table th:nth-child(6),
        .harvest-table td:nth-child(6) { width: 20%; }
        .feeding-table th:nth-child(1),
        .feeding-table td:nth-child(1) { width: 15%; }
        .feeding-table th:nth-child(2),
        .feeding-table td:nth-child(2) { width: 35%; }
        .feeding-table th:nth-child(3),
        .feeding-table td:nth-child(3) { width: 20%; }
        .feeding-table th:nth-child(4),
        .feeding-table td:nth-child(4) { width: 30%; }
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
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-container">
            <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/smartfishcarelogo.png" alt="Smart Fish Care Logo" class="logo-left" onerror="this.style.display='none'">
            <div class="header-center">
                <div class="report-title">Fish Care Records Report</div>
                <div class="user-info">Generated for: ${escapeHtml(user.username)} (${escapeHtml(user.email)})</div>
                <div class="user-info">Generated on: ${timestamp}</div>
            </div>
            <div class="logo-right">
                <img src="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/frontend/img/print_logo.jpg" alt="USTP Logo" class="logo-right-img" onerror="this.style.display='none'">
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-title">Stocking Records</div>
        ${stockingRecords.length > 0 ? `
            <table class="stocking-table">
                <thead>
                    <tr>
                        <th>Fish Type</th>
                        <th>Stock Date</th>
                        <th>Aquarium #</th>
                        <th>Quantity</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    ${stockingRecords.map(record => `
                        <tr>
                            <td>${escapeHtml(record.fishType)}</td>
                            <td>${new Date(record.stockDate).toLocaleDateString()}</td>
                            <td>${escapeHtml(record.aquariumNumber)}</td>
                            <td>${record.quantity ?? 'N/A'}</td>
                            <td>${record.notes ? escapeHtml(record.notes) : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="no-data">No stocking records found.</div>'}
    </div>
    
    <div class="section">
        <div class="section-title">Harvest Records</div>
        ${harvestRecords.length > 0 ? `
            <table class="harvest-table">
                <thead>
                    <tr>
                        <th>Fish Type</th>
                        <th>Quantity</th>
                        <th>Size</th>
                        <th>Harvest Date</th>
                        <th>Aquarium #</th>
                        <th>Weight (kg)</th>
                    </tr>
                </thead>
                <tbody>
                    ${harvestRecords.map(record => `
                        <tr>
                            <td>${escapeHtml(record.fishType)}</td>
                            <td>${record.quantity}</td>
                            <td>${escapeHtml(record.size)}</td>
                            <td>${new Date(record.harvestDate).toLocaleDateString()}</td>
                            <td>${escapeHtml(record.aquariumNumber)}</td>
                            <td>${record.weight ? Number(record.weight).toFixed(2) : 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="no-data">No harvest records found.</div>'}
    </div>
    
    <div class="section">
        <div class="section-title">Feeding Records</div>
        ${feedingRecords.length > 0 ? `
            <table class="feeding-table">
                <thead>
                    <tr>
                        <th>Fish Size</th>
                        <th>Food Type</th>
                        <th>Feeding Time</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    ${feedingRecords.map(record => `
                        <tr>
                            <td>${escapeHtml(record.fishSize)}</td>
                            <td>${escapeHtml(record.foodType)}</td>
                            <td>${escapeHtml(String(record.feedingTime))}</td>
                            <td>${record.quantity ?? 'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<div class="no-data">No feeding records found.</div>'}
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
                'Content-Disposition': 'inline; filename="fish-care-report.html"',
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

