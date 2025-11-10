/**
 * Start Python Fish Detection Server
 * Helper script to start the Python server alongside Next.js
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, '..', 'backend');
const serverScript = path.join(backendDir, 'fish_detection_server.py');

// Check if backend directory exists
if (!fs.existsSync(backendDir)) {
    console.error('❌ Backend directory not found:', backendDir);
    process.exit(1);
}

// Check if server script exists
if (!fs.existsSync(serverScript)) {
    console.error('❌ Server script not found:', serverScript);
    process.exit(1);
}

console.log('🐟 Starting Python Fish Detection Server...');
console.log('📁 Backend directory:', backendDir);

// Determine Python command (python3 or python)
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

// Start Python server
const pythonServer = spawn(pythonCmd, [serverScript], {
    cwd: backendDir,
    stdio: 'inherit',
    shell: true,
});

pythonServer.on('error', (error) => {
    console.error('❌ Failed to start Python server:', error.message);
    console.error('💡 Make sure Python is installed and virtual environment is set up');
    process.exit(1);
});

pythonServer.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ Python server exited with code ${code}`);
        process.exit(code);
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping Python server...');
    pythonServer.kill('SIGINT');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Stopping Python server...');
    pythonServer.kill('SIGTERM');
    process.exit(0);
});

console.log('✅ Python server process started');
console.log('📝 Check backend logs for model loading status');

