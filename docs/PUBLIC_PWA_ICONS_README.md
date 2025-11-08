# PWA Icons Setup Guide

To enable APK installation (PWA), you need to create icon files for the Progressive Web App.

## Required Icons

You need to create two icon files in the `public` folder:

1. `icon-192.png` - 192x192 pixels
2. `icon-512.png` - 512x512 pixels

## Quick Setup Options

### Option 1: Use Existing Logo
If you have the Smart Fish Care logo (`smartfishcarelogo.png`), you can resize it:

1. Open `public/smartfishcarelogo.png` in an image editor
2. Resize to 192x192 pixels → Save as `public/icon-192.png`
3. Resize to 512x512 pixels → Save as `public/icon-512.png`

### Option 2: Online Icon Generator
1. Visit https://www.pwabuilder.com/imageGenerator
2. Upload your logo/image
3. Download the generated icons
4. Place `icon-192.png` and `icon-512.png` in the `public` folder

### Option 3: Create from Scratch
Use any image editor to create square icons with:
- **icon-192.png**: 192x192 pixels
- **icon-512.png**: 512x512 pixels

## After Adding Icons

Once you've added the icon files:
1. Restart your Next.js development server
2. Open the app on a mobile device
3. You should see an "Install" prompt
4. On Android: Browser menu → "Add to Home Screen" or "Install App"
5. On iOS: Safari share button → "Add to Home Screen"

## Testing PWA

1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section
4. Verify icons are loading correctly
5. Test "Add to Home Screen" in mobile emulator

## Notes

- Icons should be square (1:1 aspect ratio)
- PNG format recommended
- Icons should have transparent or solid backgrounds
- For best results, use high-quality images

