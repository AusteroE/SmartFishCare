const { spawn } = require('child_process');
const path = require('path');

console.log('========================================');
console.log('Smart Fish Care - Starting All Services');
console.log('========================================');
console.log();

// Start Next.js
console.log('Starting Next.js development server...');
const nextjs = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
});

// Wait a bit for Next.js to start
setTimeout(() => {
    console.log();
    console.log('Starting IoT Python server...');

    const iotPath = path.join(process.cwd(), 'IoT');
    const isWindows = process.platform === 'win32';

    let pythonCmd;
    let pythonArgs;

    if (isWindows) {
        // Windows: Use venv activation script
        pythonCmd = path.join(iotPath, 'venv', 'Scripts', 'python.exe');
        if (require('fs').existsSync(pythonCmd)) {
            pythonArgs = [path.join(iotPath, 'server.py')];
        } else {
            // Fallback to system Python
            pythonCmd = 'python';
            pythonArgs = [path.join(iotPath, 'server.py')];
        }
    } else {
        // Linux/Mac: Use venv activation
        pythonCmd = 'bash';
        pythonArgs = ['-c', `cd ${iotPath} && source venv/bin/activate && python server.py`];
    }

    const python = spawn(pythonCmd, pythonArgs, {
        stdio: 'inherit',
        shell: true,
        cwd: iotPath
    });

    python.on('error', (err) => {
        console.error('Failed to start Python server:', err);
        console.log('Make sure you have set up the virtual environment:');
        console.log('  Windows: cd IoT && setup_venv.bat');
        console.log('  Linux/Mac: cd IoT && bash setup_venv.sh');
    });

    // Handle cleanup
    process.on('SIGINT', () => {
        console.log('\nShutting down servers...');
        nextjs.kill();
        python.kill();
        process.exit();
    });

    process.on('SIGTERM', () => {
        nextjs.kill();
        python.kill();
        process.exit();
    });
}, 3000);

console.log();
console.log('========================================');
console.log('Both servers are starting!');
console.log('========================================');
console.log();
console.log('Next.js: http://localhost:3000');
console.log('IoT Server: Running...');
console.log();
console.log('Press Ctrl+C to stop both servers');

