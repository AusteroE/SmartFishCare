import { NextRequest, NextResponse } from 'next/server';
import { updateSensorData, getLatestSensorData } from './stream/route';

export async function GET(request: NextRequest) {
    try {
        // Get latest data from in-memory storage (real-time, no database)
        const latestData = getLatestSensorData();

        const response: any = {
            status: latestData.ph !== null || latestData.temperature !== null ? 'success' : 'fetched',
            message: latestData.ph !== null || latestData.temperature !== null
                ? 'Fetched latest real-time data'
                : 'No sensor data received yet.',
            data: {
                ph: latestData.ph,
                temperature: latestData.temperature,
            },
        };

        return NextResponse.json(response);
    } catch (error: any) {
        console.error('IoT data fetch error:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: 'Server error occurred',
                data: { ph: null, temperature: null },
            },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        // Handle both JSON and form-encoded data
        const contentType = request.headers.get('content-type') || '';
        let body: any;

        if (contentType.includes('application/json')) {
            body = await request.json();
        } else {
            // Handle form-encoded data
            const formData = await request.formData();
            body = {
                ph_value: formData.get('ph_value'),
                temperature: formData.get('temperature'),
            };
        }

        const phValue = parseFloat(body.ph_value);
        const temperature = parseFloat(body.temperature);

        // Validate data ranges
        if (isNaN(phValue) || isNaN(temperature)) {
            console.error('Invalid sensor data received:', { ph_value: body.ph_value, temperature: body.temperature });
            return NextResponse.json(
                { status: 'error', message: 'Invalid ph or temperature values' },
                { status: 400 }
            );
        }

        // Validate reasonable ranges (optional but recommended)
        if (phValue < 0 || phValue > 14) {
            console.warn('pH value out of normal range:', phValue);
        }

        if (temperature < -20 || temperature > 100) {
            console.warn('Temperature value out of normal range:', temperature);
        }

        // Update in-memory data for real-time display (NO database storage)
        updateSensorData(phValue, temperature);

        console.log('✅ Sensor data updated in real-time (in-memory):', {
            ph: phValue,
            temperature: temperature,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({
            status: 'success',
            message: 'Data updated in real-time (displayed on dashboard)',
            data: {
                ph: phValue,
                temperature: temperature,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error: any) {
        console.error('❌ IoT data update error:', error);

        // Provide more detailed error information
        const errorMessage = error.message || 'Server error occurred';

        console.error('Error details:', {
            message: errorMessage,
            stack: error.stack,
        });

        return NextResponse.json(
            {
                status: 'error',
                message: `Error updating sensor data: ${errorMessage}`,
            },
            { status: 500 }
        );
    }
}
