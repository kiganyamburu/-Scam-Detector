# Scam Detector - App Store Deployment Guide

## 📋 Overview

This guide will walk you through deploying your Scam Detector app to the Apple App Store and Google Play Store.

---

## ✅ Prerequisites Checklist

### Apple App Store
- [ ] Apple Developer Account ($99/year) - [Sign up](https://developer.apple.com/programs/)
- [ ] App Store Connect access
- [ ] Mac computer (for some steps) OR use EAS Build (recommended)

### Google Play Store
- [ ] Google Play Console account ($25 one-time fee)
- [ ] Google Play Developer account

### Development Tools
- [ ] Node.js and npm installed
- [ ] Expo CLI: `npm install -g expo-cli`
- [ ] EAS CLI: `npm install -g eas-cli`

---

## 🚀 Deployment Steps

### Step 1: Update Configuration Values

Before building, update these placeholder values in your configuration files:

#### In `app.json`:
```json
"extra": {
  "eas": {
    "projectId": "YOUR_EAS_PROJECT_ID"  // Get this from expo.dev after creating project
  }
}
"owner": "YOUR_EXPO_USERNAME"  // Your Expo account username
```

#### In `eas.json`:
```json
"appleId": "YOUR_APPLE_ID@email.com"
"ascAppId": "YOUR_ASC_APP_ID"  // From App Store Connect
"appleTeamId": "YOUR_APPLE_TEAM_ID"  // From Apple Developer Portal
```

#### For Google OAuth (app.json):
```json
"iosUrlScheme": "com.googleusercontent.apps.YOUR-CLIENT-ID"
```

---

### Step 2: Initialize EAS (If not done)

```bash
cd /app/frontend

# Login to Expo
eas login

# Initialize EAS project
eas build:configure

# This will:
# 1. Create an EAS project
# 2. Give you a PROJECT_ID
# 3. Set up your credentials
```

---

### Step 3: Configure Apple Certificates

#### Option A: Automatic (Recommended)
```bash
# EAS will automatically manage your certificates
eas credentials
```

#### Option B: Manual
1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Create App ID: `com.scamdetector.app`
3. Create Distribution Certificate
4. Create Provisioning Profile
5. Upload to EAS:
   ```bash
   eas credentials
   ```

---

### Step 4: Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Scam Detector
   - **Primary Language**: English
   - **Bundle ID**: com.scamdetector.app
   - **SKU**: com.scamdetector.app (can be anything unique)
4. Click **"Create"**
5. Copy your **App ID** (format: 123456789) and update `ascAppId` in eas.json

---

### Step 5: Build for iOS (Production)

```bash
cd /app/frontend

# Build for iOS App Store
eas build --platform ios --profile production

# This will:
# 1. Upload your code to EAS servers
# 2. Build the app in the cloud
# 3. Generate an .ipa file
# 4. Take about 15-30 minutes
```

Wait for the build to complete. You'll get a URL to download the .ipa file.

---

### Step 6: Submit to App Store

#### Option A: Automatic Submission (Easiest)
```bash
eas submit --platform ios --profile production

# You'll be prompted for:
# - Your Apple ID
# - App-specific password (create at appleid.apple.com)
```

#### Option B: Manual Upload
1. Download the .ipa file from EAS
2. Use **Transporter** app (Mac):
   - Download from Mac App Store
   - Sign in with Apple ID
   - Drag and drop .ipa file
   - Click **"Deliver"**

---

### Step 7: Configure App Store Listing

Go to App Store Connect → Your App:

#### 1. **App Information**
- **Name**: Scam Detector
- **Subtitle**: Scan emails, profiles & messages
- **Privacy Policy URL**: (You'll need to create one)
- **Category**: Utilities (Primary), Productivity (Secondary)

#### 2. **Pricing and Availability**
- **Price**: Free
- **Availability**: All countries

#### 3. **Version Information (1.0)**

**Screenshots** (Already created!):
- Upload all 10 screenshots in order
- Resolution: 1284 × 2778px ✅

**Description**:
```
Protect yourself from online scams with AI-powered analysis.

Scan suspicious emails, social media profiles, text messages, job postings, marketplace listings, and more. Get instant scam scores from 0-100 with detailed explanations anyone can understand.

FEATURES:
• AI-powered scam detection
• Analyze any content type
• Easy-to-understand explanations
• Scan history to track checks
• Works with photos or screenshots
• No expertise needed

WHAT YOU CAN SCAN:
📧 Emails and messages
👤 Social media profiles
💼 Job postings and offers
🛒 Marketplace listings
💰 Investment opportunities
📢 Advertisements and promotions

Stay safe online - scan before you trust!
```

**Keywords**:
```
scam,detector,security,safety,fraud,protection,email,phishing,social media,fake
```

**Promotional Text** (optional):
```
New AI-powered scam detection! Scan emails, profiles, and messages in seconds.
```

**Support URL**: Your website or support page
**Marketing URL**: Your website (optional)

#### 4. **App Review Information**
- **Contact Email**: Your email
- **Contact Phone**: Your phone
- **Demo Account**: Not required (app works without login)
- **Notes**: 
```
This app uses AI (GPT-4 Vision) to analyze images for scam indicators. 
Users can skip authentication and use the app immediately.
The app analyzes text content in images but does not collect or store user data beyond local device storage.
```

#### 5. **Age Rating**
- Select **4+** (no mature content)

#### 6. **App Privacy**
Data Collection:
- [ ] Does NOT collect data (if you're not saving to backend)
- OR specify:
  - Location: Not collected
  - Contact Info: Email (if using auth)
  - User Content: Photos (locally processed, not stored)

---

### Step 8: Submit for Review

1. In App Store Connect, click **"Add for Review"**
2. Answer questions about:
   - Export Compliance: **No** (app doesn't use encryption for data transfer)
   - Advertising Identifier: **No**
3. Click **"Submit for Review"**

**Review Timeline**: 1-3 days typically

---

## 📱 Google Play Store (Optional)

### Build for Android:
```bash
eas build --platform android --profile production
```

### Submit to Play Store:
```bash
eas submit --platform android --profile production
```

**Play Store Setup**:
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app
3. Fill in store listing (use same description/screenshots)
4. Upload AAB file
5. Submit for review

---

## 🔄 Updating Your App

When you need to release an update:

1. **Update version** in `app.json`:
```json
"version": "1.0.1",  // Increment
"ios": {
  "buildNumber": "2"  // Auto-incremented if using EAS
}
```

2. **Build new version**:
```bash
eas build --platform ios --profile production
```

3. **Submit update**:
```bash
eas submit --platform ios --profile production
```

4. In App Store Connect:
   - Add new version
   - Update "What's New" text
   - Submit for review

---

## 🐛 Troubleshooting

### Build Fails
- Check that all package.json dependencies are compatible
- Run `npx expo-doctor` to check for issues
- Check EAS build logs for specific errors

### App Rejected by Apple
Common reasons:
- Missing privacy policy
- Incomplete app description
- App crashes on launch (test thoroughly!)
- Missing required screenshots

### Authentication Not Working
- Verify Google OAuth credentials are correct
- For Apple Sign-In, ensure you've:
  - Enabled capability in Apple Developer Portal
  - Created Service ID
  - Configured domains

---

## 📚 Additional Resources

- [Expo EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer/)

---

## ✅ Final Checklist Before Submission

- [ ] App builds successfully
- [ ] Tested on real device (not just simulator)
- [ ] All features work without crashes
- [ ] Google OAuth credentials configured
- [ ] Apple Sign-In configured (if using)
- [ ] Privacy policy created and linked
- [ ] All 10 screenshots uploaded
- [ ] App description complete
- [ ] Support email active
- [ ] App review notes filled out
- [ ] Age rating selected
- [ ] Privacy questionnaire completed

---

## 🎉 Congratulations!

Once approved, your app will be live on the App Store! 🚀

Monitor your App Store Connect dashboard for:
- Download statistics
- User reviews
- Crash reports
- Revenue (if you add in-app purchases later)
