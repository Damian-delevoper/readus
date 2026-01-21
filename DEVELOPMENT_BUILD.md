# Development Build Guide

This guide explains how to create a development build of ReadUs so that all features work, including PDF rendering which requires native modules.

## Why a Development Build?

Some features in ReadUs require native modules that aren't available in Expo Go:
- **PDF Rendering** (`react-native-pdf`) - Requires native code
- **File System Operations** - Some advanced features need native modules
- **Biometric Authentication** - Requires native modules (when implemented)

## Prerequisites

1. **Expo CLI** (already installed)
2. **EAS CLI** - Install with:
   ```bash
   npm install -g eas-cli
   ```

3. **Expo Account** - Sign up at [expo.dev](https://expo.dev) (free)

## Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

## Step 2: Login to Expo

```bash
eas login
```

## Step 3: Configure EAS Build

Create an `eas.json` file in your project root:

```bash
eas build:configure
```

This will create an `eas.json` file. You can also create it manually:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

## Step 4: Build Development Client

### For iOS Simulator (Mac only):

```bash
eas build --profile development --platform ios
```

### For Android:

```bash
eas build --profile development --platform android
```

### For Both:

```bash
eas build --profile development --platform all
```

## Step 5: Install the Development Build

### iOS:

1. After the build completes, EAS will provide a download link
2. Download the `.ipa` file
3. Install on your device/simulator:
   - **Simulator**: Drag the `.ipa` to the simulator
   - **Device**: Use TestFlight or install via Xcode

### Android:

1. After the build completes, EAS will provide a download link
2. Download the `.apk` file
3. Install on your device:
   ```bash
   adb install path/to/app.apk
   ```
   Or transfer to device and install manually

## Step 6: Run Development Server

Once the development build is installed:

```bash
npm start
```

Then:
- Press `d` to open the development build (instead of Expo Go)
- Or scan the QR code with the development build app

## Local Development Build (Alternative)

If you prefer to build locally instead of using EAS:

### iOS (Mac only):

```bash
npx expo prebuild
cd ios
pod install
cd ..
npx expo run:ios
```

### Android:

```bash
npx expo prebuild
npx expo run:android
```

**Note**: Local builds require:
- **iOS**: Xcode and CocoaPods
- **Android**: Android Studio and Android SDK

## Troubleshooting

### Build Fails

1. Check your `app.json` configuration
2. Ensure all dependencies are compatible
3. Check EAS build logs for specific errors

### PDF Still Not Working

1. Ensure you're using the development build (not Expo Go)
2. Check that `react-native-pdf` is properly linked
3. Try rebuilding: `eas build --profile development --platform ios --clear-cache`

### Metro Bundler Issues

1. Clear cache: `npx expo start --clear`
2. Reset Metro: `npx expo start --reset-cache`

## Production Build

Once you're ready for production:

```bash
eas build --profile production --platform all
```

This will create production builds for app stores.

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Development Builds Guide](https://docs.expo.dev/development/introduction/)
- [Expo Prebuild](https://docs.expo.dev/workflow/prebuild/)

## Quick Reference

```bash
# Install EAS CLI
npm install -g eas-cli

# Login
eas login

# Configure (first time)
eas build:configure

# Build development client
eas build --profile development --platform ios
eas build --profile development --platform android

# Start dev server
npm start

# Press 'd' to open in development build
```

## Features Available in Development Build

✅ PDF rendering with `react-native-pdf`  
✅ Full file system access  
✅ All native modules  
✅ Biometric authentication (when implemented)  
✅ Camera access (for future OCR)  
✅ All Expo SDK features  

## Features NOT Available in Expo Go

❌ PDF rendering (shows fallback message)  
❌ Some advanced file operations  
❌ Native biometric modules  

---

**Next Steps**: After creating your development build, all features will work as expected!
