# TukTik Driver - Android App

แอปสำหรับคนขับ TukTik

## Quick Start

```bash
# Build APK
cd android && ./gradlew assembleDebug

# หรือใช้ npm script
npm run build:android
```

## APK Location

```
android/app/build/outputs/apk/debug/app-debug.apk
```

## Configuration

| Setting | Value |
|---------|-------|
| Package Name | `com.tuktik.driver` |
| App Name | TukTik Driver |
| URL | `https://car-rental-phi-lime.vercel.app/driver` |

## Firebase Setup (สำคัญ!)

ต้องเพิ่ม Android App ใน Firebase Console:

1. ไป Firebase Console → Project Settings → Add App → Android
2. Package name: `com.tuktik.driver`
3. Download `google-services.json` ใหม่
4. วางที่ `android/app/google-services.json`
5. Build ใหม่

## Commands

```bash
# Build debug APK
npm run build:android

# Build release APK
npm run build:android:release

# Sync Capacitor
npm run sync

# Open in Android Studio
npm run open:android
```

## Folder Structure

```
driver-app/
├── android/              # Android project
│   ├── app/
│   │   ├── build/outputs/apk/debug/app-debug.apk  # APK output
│   │   └── google-services.json
│   └── gradle.properties
├── www/                  # Web assets (placeholder)
├── capacitor.config.ts   # Capacitor config
└── package.json
```

## Notes

- ใช้ WebView URL mode (โหลดจาก Vercel)
- รองรับ Push Notifications
- รองรับ Google Sign-in
- รองรับ Phone Auth
