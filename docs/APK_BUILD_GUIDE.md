# APK Build Guide for Smart Fish Care

This guide explains how to build an Android APK from your Smart Fish Care PWA using Bubblewrap (Google's TWA - Trusted Web Activity tool).

## Prerequisites

1. **Node.js** (v14 or higher) - Already installed
2. **Java JDK** (v11 or higher) - Required for Android app building
   - Download from: https://adoptium.net/
   - Or use: `choco install openjdk11` (Windows with Chocolatey)
3. **Android SDK** - Required for building Android apps
   - Install Android Studio: https://developer.android.com/studio
   - Or install Android SDK Command Line Tools: https://developer.android.com/studio#command-tools
4. **Bubblewrap CLI** - Will be installed via npm

## Step 1: Install Bubblewrap CLI

```bash
npm install -g @bubblewrap/cli
```

## Step 2: Initialize TWA Project

1. **The web manifest URL is already configured** in `twa-manifest.json`:
   - Domain: `https://smartfishcare.site/`

2. **Initialize the TWA project**:
   ```bash
   npm run apk:init
   ```
   
   Or manually:
   ```bash
   bubblewrap init --manifest=https://smartfishcare.site/manifest.json --config=twa-manifest.json
   ```

## Step 3: Generate Android Signing Key (First Time Only)

```bash
bubblewrap keygen
```

This will:
- Create an `android.keystore` file
- Generate a signing key for your app
- **IMPORTANT**: Save the keystore password and key alias password securely!

## Step 4: Build the APK

### Option A: Build Debug APK (for testing)

```bash
bubblewrap build
```

This creates a debug APK at: `./app/build/outputs/bundle/debug/app-debug.aab`

### Option B: Build Release APK (for production)

```bash
bubblewrap build --release
```

This creates a release APK at: `./app/build/outputs/bundle/release/app-release.aab`

## Step 5: Install APK on Device

### For Debug APK:
1. Transfer the APK file to your Android device
2. Enable "Install from Unknown Sources" in Android settings
3. Open the APK file and install

### For Release APK:
1. Build a signed APK (see Step 6)
2. Distribute through Google Play Store or direct installation

## Step 6: Build Signed Release APK

To create a production-ready, signed APK:

```bash
bubblewrap build --release --signingKeyPath=./android.keystore --signingKeyAlias=android
```

You'll be prompted for:
- Keystore password
- Key alias password

The signed APK will be at: `./app/build/outputs/bundle/release/app-release.aab`

## Step 7: Update App Version

To update the app version, edit `twa-manifest.json`:

```json
{
  "appVersionName": "1.0.1",
  "appVersionCode": 2
}
```

Then rebuild:
```bash
bubblewrap build --release
```

## Alternative: Using Android Studio

1. Open the generated `./app` folder in Android Studio
2. Build > Build Bundle(s) / APK(s) > Build APK(s)
3. The APK will be in `./app/build/outputs/apk/`

## Troubleshooting

### Issue: "Android SDK not found"
**Solution**: Set ANDROID_HOME environment variable:
```bash
# Windows
set ANDROID_HOME=C:\Users\YourUsername\AppData\Local\Android\Sdk

# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
```

### Issue: "Java not found"
**Solution**: Set JAVA_HOME environment variable:
```bash
# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-11

# Linux/Mac
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk
```

### Issue: "Build failed"
**Solution**: 
1. Make sure your PWA is accessible at the manifest URL
2. Check that all icons exist and are accessible
3. Verify the manifest.json is valid JSON

## Quick Build Script

Add this to `package.json`:

```json
{
  "scripts": {
    "apk:init": "bubblewrap init --manifest=https://your-domain.com/manifest.json --config=twa-manifest.json",
    "apk:build": "bubblewrap build",
    "apk:build-release": "bubblewrap build --release",
    "apk:update": "bubblewrap update"
  }
}
```

Then run:
```bash
npm run apk:build-release
```

## Publishing to Google Play Store

1. Build a signed release APK (Step 6)
2. Go to Google Play Console: https://play.google.com/console
3. Create a new app
4. Upload the AAB file (Android App Bundle)
5. Fill in app details, screenshots, etc.
6. Submit for review

## Notes

- The APK will be a wrapper around your PWA
- All functionality will work as in the browser
- You can update the app by updating your PWA (if you enable updates)
- The app will be installed as a standalone app on Android devices

## Resources

- Bubblewrap Documentation: https://github.com/GoogleChromeLabs/bubblewrap
- TWA Documentation: https://developer.chrome.com/docs/android/trusted-web-activity
- Android App Bundle Guide: https://developer.android.com/guide/app-bundle

