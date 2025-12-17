# 🛡️ Scam Detector

An AI-powered mobile application that analyzes images for potential scams, phishing attempts, and fraudulent content using advanced machine learning models.

## 📱 Overview

Scam Detector is a cross-platform mobile app (iOS & Android) built with React Native and Expo that helps users identify potential scams by analyzing screenshots, emails, messages, or any suspicious images. The app uses Google's Gemini AI to provide real-time scam detection with detailed risk assessments.

## ✨ Features

- 📸 **Image Analysis**: Scan images from camera or photo library
- 🤖 **AI-Powered Detection**: Leverages Google Gemini for intelligent scam analysis
- 📊 **Risk Scoring**: Three-tier risk assessment (Safe, Suspicious, Scam)
- 🔍 **Detailed Indicators**: Specific explanations for each detected red flag
- 📜 **History Tracking**: Keep records of previous scans
- 🔐 **Secure Authentication**: Google Sign-In and Apple Sign-In support
- 💾 **Cloud Storage**: MongoDB-backed scan history

## 🏗️ Architecture

### Frontend
- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Language**: TypeScript
- **Key Libraries**:
  - `expo-image-picker` - Image selection
  - `@react-native-google-signin/google-signin` - OAuth
  - `expo-apple-authentication` - Apple Sign-In
  - `@react-native-async-storage/async-storage` - Local storage

### Backend
- **Framework**: FastAPI (Python)
- **Database**: MongoDB with Motor (async driver)
- **AI Model**: Google Gemini 2.0 Flash
- **Authentication**: JWT tokens with Google OAuth2
- **Key Libraries**:
  - `google-generativeai` - AI analysis
  - `motor` - MongoDB async driver
  - `python-jose` - JWT handling
  - `google-auth` - OAuth verification

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Python (v3.10+)
- MongoDB instance
- Google Cloud account (for Gemini API)
- Expo CLI: `npm install -g expo-cli`

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment and activate it:
```bash
python -m venv .venv
# Windows
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file:
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=scam_detector
GOOGLE_API_KEY=your_gemini_api_key
JWT_SECRET=your_jwt_secret
```

5. Start the server:
```bash
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```env
EXPO_PUBLIC_BACKEND_URL=http://your-backend-url/api
```

4. Start the development server:
```bash
npm start
```

5. Run on device:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## 🔧 Configuration

### Google OAuth Setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Google+ API and Gemini API
3. Create OAuth 2.0 credentials
4. Configure authorized redirect URIs
5. Update `app.json` with your client IDs

### Apple Sign-In Setup

1. Configure in Apple Developer Portal
2. Enable Sign in with Apple capability
3. Update bundle identifier in `app.json`

## 📂 Project Structure

```
-Scam-Detector/
├── backend/
│   ├── server.py          # FastAPI application
│   └── requirements.txt   # Python dependencies
├── frontend/
│   ├── app/              # App screens
│   │   ├── index.tsx     # Main scan screen
│   │   ├── login.tsx     # Authentication
│   │   ├── history.tsx   # Scan history
│   │   └── _layout.tsx   # Navigation layout
│   ├── contexts/         # React contexts
│   ├── utils/            # Utility functions
│   └── package.json      # Node dependencies
└── tests/                # Test files
```

## 🧪 Testing

Run backend tests:
```bash
python backend_test.py
python detailed_backend_test.py
```

## 📦 Deployment

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions on deploying to:
- Apple App Store
- Google Play Store
- Using Expo EAS Build

## 🔐 Security

- JWT-based authentication with 7-day expiry
- Secure token storage using Expo Secure Store
- OAuth2 integration for Google and Apple
- Environment variables for sensitive data
- CORS protection on backend

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

This project is private and proprietary.

## 🐛 Known Issues

- Check [test_result.md](test_result.md) for current test status
- Backend requires internet connection for AI analysis
- Image size limited to 20MB for optimal performance

## 🔮 Roadmap

- [ ] Offline caching of analysis results
- [ ] Multi-language support
- [ ] Browser extension version
- [ ] Real-time URL scanning
- [ ] Community reporting features

## 📞 Support

For issues and questions, please create an issue in the repository.

## 🙏 Acknowledgments

- Google Gemini AI for scam detection capabilities
- Expo team for the excellent cross-platform framework
- FastAPI for the robust backend framework
