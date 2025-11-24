# Mobile App Testing on Phone - Complete Guide

**Date Created:** 2025-01-27  
**Framework:** React Native + Expo  
**Purpose:** Guide for testing mobile app on physical devices during development

---

## Overview

This guide covers all methods to test your React Native/Expo mobile app on your phone while coding. Multiple options are available depending on your needs.

---

## Method 1: Expo Go App (Easiest - Recommended for Development)

### Setup Steps:

1. **Install Expo Go on Your Phone**
   - **iOS:** Search "Expo Go" in App Store
   - **Android:** Search "Expo Go" in Google Play Store
   - Free app, no account needed

2. **Start Development Server**
   ```bash
   cd rentapp-mobile
   npx expo start
   ```
   Or if using npm scripts:
   ```bash
   npm start
   ```

3. **Scan QR Code**
   - **iOS:** Use built-in Camera app to scan QR code
   - **Android:** Open Expo Go app → Tap "Scan QR code"
   - App will load on your phone automatically

4. **Hot Reload**
   - Make changes in code
   - Save file
   - App automatically reloads on phone
   - See changes instantly!

### Developer Menu (Shake Phone):
- Reload app
- Open debugger
- Show performance monitor
- View logs
- Enable fast refresh

### Pros:
- ✅ No build needed
- ✅ Instant testing
- ✅ Works on both iOS and Android
- ✅ Hot reload enabled
- ✅ Free and easy

### Cons:
- ⚠️ Some advanced native modules may not work
- ⚠️ Requires internet connection (or same WiFi)
- ⚠️ Limited to Expo-compatible libraries

---

## Method 2: Development Build (More Features)

### When to Use:
- Need custom native modules
- Want to test production-like experience
- Need offline functionality

### Setup:

**For Android:**
```bash
npx expo run:android
```
- Connects to phone via USB (if connected)
- Or installs APK file you can transfer

**For iOS (Mac only):**
```bash
npx expo run:ios
```
- Requires Xcode
- Needs Apple Developer account for physical device

### Pros:
- ✅ Full native features
- ✅ Works offline
- ✅ Closer to production app
- ✅ Can use any native module

### Cons:
- ⚠️ Requires rebuild for native changes
- ⚠️ More setup required
- ⚠️ Slower iteration cycle

---

## Method 3: USB Debugging (Android)

### Setup:

1. **Enable Developer Options on Android:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Developer Options will appear

2. **Enable USB Debugging:**
   - Settings → Developer Options
   - Enable "USB Debugging"

3. **Connect Phone via USB:**
   ```bash
   # Check if phone is detected
   adb devices
   
   # If not detected, install ADB:
   # Windows: Download Android SDK Platform Tools
   # Mac/Linux: brew install android-platform-tools
   ```

4. **Run App:**
   ```bash
   npx expo run:android
   ```
   App installs directly on phone via USB

### Pros:
- ✅ Direct connection
- ✅ Fast deployment
- ✅ Can see logs in terminal
- ✅ No WiFi needed

### Cons:
- ⚠️ Requires USB cable
- ⚠️ Android only (iOS needs Mac + Xcode)

---

## Method 4: WiFi Debugging (No Cable - Android)

### Setup:

1. **Connect phone and computer to same WiFi**

2. **Enable Wireless Debugging:**
   - Settings → Developer Options
   - Enable "Wireless debugging"
   - Note the IP address and port shown

3. **Connect via ADB:**
   ```bash
   adb connect <phone-ip-address>:5555
   # Example: adb connect 192.168.1.50:5555
   ```

4. **Verify connection:**
   ```bash
   adb devices
   # Should show your phone
   ```

5. **Run app:**
   ```bash
   npx expo run:android
   ```

### Pros:
- ✅ No USB cable needed
- ✅ Wireless connection
- ✅ Full debugging capabilities

### Cons:
- ⚠️ Android only
- ⚠️ Requires same WiFi network
- ⚠️ Slightly slower than USB

---

## Network Configuration for API Testing

### Problem:
Your backend runs on `localhost:8000`, but phone can't access `localhost` from your computer.

### Solution 1: Use Computer's IP Address

1. **Find your computer's local IP:**
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ifconfig` or `ip addr`
   - Example: `192.168.1.100`

2. **Update API config in mobile app:**
   ```javascript
   // In your API config file
   const API_BASE_URL = 'http://192.168.1.100:8000/api/v1';
   // Replace with your actual IP address
   ```

3. **Ensure phone and computer are on same WiFi**

### Solution 2: Use ngrok (External Testing)

1. **Install ngrok:**
   ```bash
   npm install -g ngrok
   # or download from ngrok.com
   ```

2. **Start tunnel:**
   ```bash
   ngrok http 8000
   ```

3. **Use ngrok URL in API config:**
   ```javascript
   const API_BASE_URL = 'https://abc123.ngrok.io/api/v1';
   ```

4. **Pros:**
   - ✅ Works from anywhere (not just same WiFi)
   - ✅ Can test from different networks
   - ✅ Good for testing with team

5. **Cons:**
   - ⚠️ URL changes each time (unless paid plan)
   - ⚠️ Requires internet connection

### Solution 3: Deploy Backend (Production/Staging)

Use your deployed backend URL:
```javascript
const API_BASE_URL = 'https://your-api-domain.com/api/v1';
```

---

## Complete Testing Workflow

### Daily Development:

1. **Start Backend:**
   ```bash
   cd backend
   php artisan serve
   # Runs on http://localhost:8000
   ```

2. **Start Mobile App:**
   ```bash
   cd rentapp-mobile
   npx expo start
   ```

3. **Open on Phone:**
   - Scan QR code with Expo Go
   - Or connect via USB and run `npx expo run:android`

4. **Code and Test:**
   - Make changes in code
   - Save file
   - App auto-reloads on phone
   - Test functionality

5. **Debug:**
   - Shake phone for developer menu
   - View logs in terminal
   - Use React Native Debugger

---

## Developer Menu Features

**Access:** Shake phone or press `Cmd+D` (iOS) / `Cmd+M` (Android) in simulator

**Options:**
- **Reload** - Restart app
- **Debug** - Open Chrome DevTools
- **Show Performance Monitor** - View FPS, memory
- **Enable Fast Refresh** - Auto-reload on save
- **Show Element Inspector** - Inspect UI elements

---

## Troubleshooting

### Can't Connect to Backend API

**Problem:** Phone can't reach `localhost:8000`

**Solutions:**
1. Use computer's IP address instead of localhost
2. Ensure phone and computer on same WiFi
3. Check firewall isn't blocking port 8000
4. Verify backend is running and accessible

### QR Code Not Scanning

**Problem:** Can't scan QR code to open app

**Solutions:**
1. Ensure Expo Go is installed
2. Check network connection
3. Try typing URL manually in Expo Go
4. Restart Expo server: `npx expo start --clear`

### Changes Not Appearing

**Problem:** Code changes don't show on phone

**Solutions:**
1. Shake phone → Tap "Reload"
2. Press `r` in terminal to reload
3. Restart Expo server
4. Clear cache: `npx expo start --clear`

### App Crashes on Phone

**Problem:** App crashes when opening

**Solutions:**
1. Check terminal for error messages
2. View logs: `npx expo start --dev-client`
3. Check if all dependencies installed
4. Verify API URL is correct
5. Check network connectivity

### USB Not Detected (Android)

**Problem:** `adb devices` shows nothing

**Solutions:**
1. Enable USB debugging in Developer Options
2. Allow USB debugging prompt on phone
3. Install/update ADB drivers
4. Try different USB cable
5. Check USB connection mode (should be File Transfer)

---

## Recommended Setup for Your Project

### Phase 1: Development (Start Here)
- **Method:** Expo Go
- **Why:** Fastest iteration, easiest setup
- **Best for:** UI development, API integration testing

### Phase 2: Advanced Testing
- **Method:** Development Build + USB Debugging
- **Why:** Test native features, offline functionality
- **Best for:** Payment features, file uploads, notifications

### Phase 3: Beta Testing
- **Method:** TestFlight (iOS) / Internal Testing (Android)
- **Why:** Test with real users, production-like environment
- **Best for:** Final testing before release

---

## Quick Reference Commands

```bash
# Start Expo development server
npx expo start

# Start with cleared cache
npx expo start --clear

# Run on Android (USB connected)
npx expo run:android

# Run on iOS (Mac only, simulator)
npx expo run:ios

# Check connected devices (Android)
adb devices

# Connect Android via WiFi
adb connect <ip-address>:5555

# View logs
npx expo start --dev-client
```

---

## API Configuration Example

**File:** `mobile-app/src/config/api.js`

```javascript
// Development - Use your computer's IP
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.1.100:8000/api/v1'  // Replace with your IP
  : 'https://your-api-domain.com/api/v1'; // Production

export default API_BASE_URL;
```

**To find your IP:**
- Windows: `ipconfig` → IPv4 Address
- Mac/Linux: `ifconfig` or `ip addr` → inet address

---

## Tips & Best Practices

1. **Keep phone and computer on same WiFi** for Expo Go
2. **Use TypeScript** for better development experience
3. **Enable hot reload** (default in Expo)
4. **Test on both iOS and Android** if possible
5. **Use React Native Debugger** for advanced debugging
6. **Keep Expo Go updated** on your phone
7. **Clear cache** if experiencing weird issues: `npx expo start --clear`
8. **Use development builds** for features Expo Go doesn't support
9. **Test on real devices** not just simulators
10. **Document your IP address** for easy reference

---

## Next Steps

1. Install Expo Go on your phone
2. Create mobile app project: `npx create-expo-app rentapp-mobile`
3. Configure API base URL with your computer's IP
4. Start development: `npx expo start`
5. Scan QR code and start coding!

---

**Last Updated:** 2025-01-27  
**Status:** Ready for use when starting mobile development

