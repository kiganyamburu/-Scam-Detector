import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Configure Google Sign-In
GoogleSignin.configure({
  // Note: You'll need to add your actual Web Client ID here
  // webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
  // For now, this will be configured during build
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      // Check if device supports Google Play Services
      await GoogleSignin.hasPlayServices();
      
      // Sign in and get user info
      const userInfo = await GoogleSignin.signIn();
      
      if (!userInfo.data?.idToken) {
        throw new Error('No ID token received');
      }

      // Send token to backend for verification
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: userInfo.data.idToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // Save authentication
      await signIn(data.access_token, data.user);
      
      // Navigate to main screen
      router.replace('/');
    } catch (error: any) {
      console.error('Google sign in error:', error);
      Alert.alert(
        'Sign In Failed',
        error.message || 'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Send to backend
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/auth/apple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id_token: credential.identityToken,
          user_data: credential.fullName ? {
            email: credential.email,
            fullName: credential.fullName,
          } : null,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // Save authentication
      await signIn(data.access_token, data.user);
      
      // Navigate to main screen
      router.replace('/');
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign in error:', error);
        Alert.alert(
          'Sign In Failed',
          'Failed to sign in with Apple. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and Title */}
        <View style={styles.header}>
          <MaterialIcons name="security" size={80} color="#3b82f6" />
          <Text style={styles.title}>Scam Detector</Text>
          <Text style={styles.subtitle}>
            Sign in to save your scans and stay protected from scams across all platforms
          </Text>
        </View>

        {/* Sign In Buttons */}
        <View style={styles.buttonContainer}>
          {/* Google Sign In */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#1f2937" />
            ) : (
              <>
                <MaterialIcons name="login" size={24} color="#1f2937" />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Apple Sign In - Only show on iOS */}
          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={12}
              style={styles.appleButton}
              onPress={handleAppleSignIn}
            />
          )}
        </View>

        {/* Skip for now */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  googleButtonText: {
    color: '#1f2937',
    fontSize: 16,
    fontWeight: '600',
  },
  appleButton: {
    height: 56,
  },
  skipButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#6b7280',
    textDecoration: 'underline',
  },
});
