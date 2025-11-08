#!/usr/bin/env node

/**
 * Build APK Script for Smart Fish Care
 * 
 * This script automates the APK building process using Bubblewrap.
 * Make sure you have:
 * 1. Node.js installed
 * 2. Java JDK installed
 * 3. Android SDK installed
 * 4. Bubblewrap CLI installed (npm install -g @bubblewrap/cli)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    manifestUrl: process.env.MANIFEST_URL || 'https://smartfishcare.site/manifest.json',
    twaConfigPath: path.join(__dirname, '..', 'twa-manifest.json'),
    buildType: process.argv[2] || 'debug', // 'debug' or 'release'
};

console.log('🚀 Smart Fish Care - APK Builder\n');

// Check if Bubblewrap is installed
function checkBubblewrap() {
    try {
        execSync('bubblewrap --version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        console.error('❌ Bubblewrap CLI not found!');
        console.log('📦 Installing Bubblewrap CLI...');
        try {
            execSync('npm install -g @bubblewrap/cli', { stdio: 'inherit' });
            console.log('✅ Bubblewrap CLI installed successfully!');
            return true;
        } catch (installError) {
            console.error('❌ Failed to install Bubblewrap CLI');
            console.error('Please install manually: npm install -g @bubblewrap/cli');
            return false;
        }
    }
}

// Check if twa-manifest.json exists
function checkTwaConfig() {
    if (!fs.existsSync(CONFIG.twaConfigPath)) {
        console.error('❌ twa-manifest.json not found!');
        console.log('📝 Creating twa-manifest.json...');

        // Read the template
        const template = {
            packageId: "com.smartfishcare.app",
            name: "Smart Fish Care",
            launcherName: "SmartFish",
            display: "standalone",
            themeColor: "#7c5cff",
            navigationColor: "#0b1020",
            backgroundColor: "#0b1020",
            enableNotifications: true,
            startUrl: "/",
            iconUrl: `${CONFIG.manifestUrl.replace('/manifest.json', '/icon-512.png')}`,
            maskableIconUrl: `${CONFIG.manifestUrl.replace('/manifest.json', '/icon-512.png')}`,
            monochromeIconUrl: `${CONFIG.manifestUrl.replace('/manifest.json', '/icon-512.png')}`,
            splashScreenFadeOutDuration: 300,
            signingKey: {
                path: "./android.keystore",
                alias: "android"
            },
            appVersionName: "1.0.0",
            appVersionCode: 1,
            shortcuts: [
                {
                    name: "Dashboard",
                    shortName: "Dashboard",
                    url: "/dashboard",
                    icons: [
                        {
                            url: `${CONFIG.manifestUrl.replace('/manifest.json', '/icon-192.png')}`,
                            sizes: "192x192"
                        }
                    ]
                }
            ],
            generatorApp: "bubblewrap-cli",
            webManifestUrl: CONFIG.manifestUrl
        };

        fs.writeFileSync(CONFIG.twaConfigPath, JSON.stringify(template, null, 2));
        console.log('✅ twa-manifest.json created!');
        console.log('⚠️  Please update the manifest URL in twa-manifest.json with your actual domain!');
        return false;
    }
    return true;
}

// Initialize TWA project
function initTwa() {
    console.log('📦 Initializing TWA project...');
    try {
        if (!fs.existsSync(path.join(__dirname, '..', 'app'))) {
            execSync(
                `bubblewrap init --manifest=${CONFIG.manifestUrl} --config=${CONFIG.twaConfigPath}`,
                { stdio: 'inherit', cwd: path.join(__dirname, '..') }
            );
            console.log('✅ TWA project initialized!');
        } else {
            console.log('ℹ️  TWA project already exists. Skipping initialization.');
        }
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize TWA project');
        console.error(error.message);
        return false;
    }
}

// Build APK
function buildApk() {
    console.log(`🔨 Building ${CONFIG.buildType} APK...`);

    const buildCommand = CONFIG.buildType === 'release'
        ? 'bubblewrap build --release'
        : 'bubblewrap build';

    try {
        execSync(buildCommand, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        const outputPath = CONFIG.buildType === 'release'
            ? './app/build/outputs/bundle/release/app-release.aab'
            : './app/build/outputs/bundle/debug/app-debug.aab';

        console.log(`\n✅ APK built successfully!`);
        console.log(`📦 Output: ${outputPath}`);
        console.log(`\n📱 To install on Android device:`);
        console.log(`   1. Transfer the AAB file to your device`);
        console.log(`   2. Enable "Install from Unknown Sources"`);
        console.log(`   3. Open and install the file`);

        return true;
    } catch (error) {
        console.error('❌ Failed to build APK');
        console.error(error.message);
        return false;
    }
}

// Main execution
async function main() {
    // Check prerequisites
    if (!checkBubblewrap()) {
        process.exit(1);
    }

    // Check config
    if (!checkTwaConfig()) {
        console.log('\n⚠️  Please update twa-manifest.json with your actual domain and run again.');
        process.exit(1);
    }

    // Initialize if needed
    if (!fs.existsSync(path.join(__dirname, '..', 'app'))) {
        if (!initTwa()) {
            process.exit(1);
        }
    }

    // Build APK
    if (!buildApk()) {
        process.exit(1);
    }

    console.log('\n🎉 All done!');
}

main();

