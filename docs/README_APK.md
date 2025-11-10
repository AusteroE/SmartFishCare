# 📱 APK Installation Guide for Smart Fish Care

## Quick Start

### Prerequisites
1. **Java JDK 11+** - Download from [Adoptium](https://adoptium.net/)
2. **Android SDK** - Install [Android Studio](https://developer.android.com/studio) or Android SDK Command Line Tools
3. **Node.js** - Already installed ✅

### Step 1: Install Bubblewrap CLI
```bash
npm install -g @bubblewrap/cli
```

### Step 2: Configuration ✅
The domain is already configured: `https://smartfishcare.site/`

### Step 3: Generate App Icons (if missing)
```bash
npm run generate-icons
```
This creates `icon-192.png` and `icon-512.png` in the `public` folder.

### Step 4: Build APK

#### Debug APK (for testing):
```bash
npm run apk:build
```

#### Release APK (for production):
```bash
npm run apk:build-release
```

### Step 5: Install on Android Device
1. Transfer the generated `.aab` file from `./app/build/outputs/bundle/` to your Android device
2. Enable "Install from Unknown Sources" in Android settings
3. Open the file and install

## File Locations
- **Debug APK**: `./app/build/outputs/bundle/debug/app-debug.aab`
- **Release APK**: `./app/build/outputs/bundle/release/app-release.aab`

## Troubleshooting

### "Android SDK not found"
Set environment variable:
```bash
# Windows
set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk

# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
```

### "Java not found"
Set environment variable:
```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-11

# Linux/Mac
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

### "Icons not found"
Run: `npm run generate-icons` to generate the required icon files.

## Full Documentation
See [docs/APK_BUILD_GUIDE.md](./docs/APK_BUILD_GUIDE.md) for detailed instructions.

## Notes
- The APK wraps your PWA as a native Android app
- All web functionality works the same
- Updates can be pushed by updating your PWA
- The app will appear as a standalone app on Android devices

