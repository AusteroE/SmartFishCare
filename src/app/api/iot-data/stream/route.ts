import { NextRequest } from 'next/server';

// Store the latest sensor data in memory for SSE (shared across requests)
// Real-time data only - NO database storage
let latestSensorData: { ph: number | null; temperature: number | null; timestamp: number } = {
    ph: null,
    temperature: null,
    timestamp: Date.now(),
};

// Function to update sensor data (called by POST endpoint)
export function updateSensorData(ph: number, temperature: number) {
    latestSensorData = {
        ph,
        temperature,
        timestamp: Date.now(),
    };
    console.log('Sensor data updated in memory:', latestSensorData);
}

// Get current sensor data
export function getLatestSensorData() {
    return latestSensorData;
}

// SSE endpoint for real-time sensor data
export async function GET(request: NextRequest) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Send initial data
            const sendData = (data: typeof latestSensorData) => {
                const message = `data: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            // Send current data immediately
            sendData(latestSensorData);
            console.log('SSE: Sent initial data to client:', latestSensorData);

            // Set up interval to check for updates (real-time only, no database)
            let lastSentTimestamp = latestSensorData.timestamp;
            let lastSentData = JSON.stringify(latestSensorData);
            const interval = setInterval(() => {
                try {
                    // Check if in-memory data has been updated (by timestamp or by value change)
                    const currentDataString = JSON.stringify(latestSensorData);
                    if (latestSensorData.timestamp > lastSentTimestamp || currentDataString !== lastSentData) {
                        sendData(latestSensorData);
                        console.log('SSE: Sent updated data to client:', latestSensorData);
                        lastSentTimestamp = latestSensorData.timestamp;
                        lastSentData = currentDataString;
                    }
                } catch (error) {
                    console.error('Error in SSE stream:', error);
                }
            }, 500); // Check every 500ms for real-time updates

            // Clean up on client disconnect
            request.signal.addEventListener('abort', () => {
                clearInterval(interval);
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no', // Disable buffering in nginx
        },
    });
}

