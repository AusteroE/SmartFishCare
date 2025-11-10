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

    // Start Python Fish Detection Server (optional)
    setTimeout(() => {
        console.log();
        console.log('Starting Python Fish Detection Server (optional)...');

        const backendPath = path.join(process.cwd(), 'backend');
        const fishDetectionScript = path.join(backendPath, 'fish_detection_server.py');

        if (require('fs').existsSync(fishDetectionScript)) {
            let fishPythonCmd;
            let fishPythonArgs;

            if (isWindows) {
                const venvPython = path.join(backendPath, 'venv', 'Scripts', 'python.exe');
                if (require('fs').existsSync(venvPython)) {
                    fishPythonCmd = venvPython;
                    fishPythonArgs = [fishDetectionScript];
                } else {
                    fishPythonCmd = 'python';
                    fishPythonArgs = [fishDetectionScript];
                }
            } else {
                fishPythonCmd = 'bash';
                fishPythonArgs = ['-c', `cd ${backendPath} && source venv/bin/activate && python fish_detection_server.py`];
            }

            const fishPython = spawn(fishPythonCmd, fishPythonArgs, {
                stdio: 'inherit',
                shell: true,
                cwd: backendPath
            });

            fishPython.on('error', (err) => {
                console.log('Fish Detection Server not started (optional - model may not be set up)');
            });

            // Handle cleanup
            process.on('SIGINT', () => {
                console.log('\nShutting down servers...');
                nextjs.kill();
                python.kill();
                if (fishPython) fishPython.kill();
                process.exit();
            });

            process.on('SIGTERM', () => {
                nextjs.kill();
                python.kill();
                if (fishPython) fishPython.kill();
                process.exit();
            });
        } else {
            console.log('Fish Detection Server script not found (optional)');
        }
    }, 6000);
}, 3000);

console.log();
console.log('========================================');
console.log('All servers are starting!');
console.log('========================================');
console.log();
console.log('Next.js: http://localhost:3000');
console.log('IoT Server: Running...');
console.log('Fish Detection Server: Optional (if model configured)');
console.log();
console.log('Press Ctrl+C to stop all servers');

