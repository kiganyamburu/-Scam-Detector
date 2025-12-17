import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { saveToHistory } from '../utils/historyStorage';

const EXPO_PUBLIC_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface ScamIndicator {
  title: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

interface AnalysisResult {
  score: number;
  risk_level: 'safe' | 'suspicious' | 'scam';
  indicators: ScamIndicator[];
  summary: string;
}

export default function Index() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    error: string;
    details: string;
    logs: string[];
  } | null>(null);
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const requestPermission = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted' || mediaStatus !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Please allow camera and photo library access to use this app.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.8,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setResult(null);
        setErrorDetails(null);
        analyzeImage(result.assets[0].base64!, result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const analyzeImage = async (base64Image: string, uri: string) => {
    if (!base64Image) return;

    setAnalyzing(true);
    setErrorDetails(null);
    try {
      const response = await fetch(`${EXPO_PUBLIC_BACKEND_URL}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: base64Image,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle error response with details
        const errorInfo = data.detail || {};
        const errorDetails = {
          error: errorInfo.error || 'Analysis Failed',
          details: errorInfo.details || data.detail || 'Failed to analyze image',
          logs: errorInfo.logs || [],
        };
        setErrorDetails(errorDetails);
        
        // Save failed analysis to history
        await saveToHistory({
          imageUri: uri,
          imageBase64: base64Image,
          error: errorDetails,
        });
        
        return;
      }

      setResult(data);
      setErrorDetails(null);
      
      // Save successful analysis to history
      await saveToHistory({
        imageUri: uri,
        imageBase64: base64Image,
        analysis: data,
      });
      
    } catch (error: any) {
      console.error('Analysis error:', error);
      const errorDetails = {
        error: 'Network Error',
        details: error.message || 'Failed to connect to the server. Please check your internet connection and try again.',
        logs: [`Network request failed: ${error.message}`],
      };
      setErrorDetails(errorDetails);
      
      // Save network error to history
      await saveToHistory({
        imageUri: uri,
        imageBase64: base64Image,
        error: errorDetails,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'safe':
        return '#10b981';
      case 'suspicious':
        return '#f59e0b';
      case 'scam':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const resetScan = () => {
    setImageUri(null);
    setResult(null);
    setErrorDetails(null);
  };

  const handleSignOut = async () => {
    await signOut();
    Alert.alert('Signed Out', 'You have been signed out successfully.');
  };

  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header with Auth Status */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <MaterialIcons name="security" size={40} color="#3b82f6" />
              <View>
                <Text style={styles.title}>Scam Detector</Text>
                {user && (
                  <Text style={styles.userEmail}>{user.email}</Text>
                )}
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                onPress={() => router.push('/history')}
                style={styles.historyButton}
              >
                <MaterialIcons name="history" size={24} color="#3b82f6" />
              </TouchableOpacity>
              {user ? (
                <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
                  <MaterialIcons name="logout" size={24} color="#ef4444" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/login')}
                  style={styles.signInButton}
                >
                  <MaterialIcons name="login" size={20} color="white" />
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <Text style={styles.subtitle}>
            Scan anything suspicious - emails, social media profiles, messages, ads, or any content
          </Text>
        </View>

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.image} />
          </View>
        )}

        {/* Upload Buttons */}
        {!analyzing && !result && (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => pickImage(true)}
            >
              <MaterialIcons name="photo-camera" size={24} color="white" />
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => pickImage(false)}
            >
              <MaterialIcons name="photo-library" size={24} color="#3b82f6" />
              <Text style={styles.secondaryButtonText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {analyzing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>
              Analyzing for scam indicators...
            </Text>
          </View>
        )}

        {/* Error Display */}
        {errorDetails && !analyzing && (
          <View style={styles.errorContainer}>
            <View style={styles.errorHeader}>
              <MaterialIcons name="error" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>{errorDetails.error}</Text>
            </View>

            <View style={styles.errorDetailsCard}>
              <Text style={styles.errorDetailsTitle}>What Happened?</Text>
              <Text style={styles.errorDetailsText}>{errorDetails.details}</Text>
            </View>

            {errorDetails.logs && errorDetails.logs.length > 0 && (
              <View style={styles.logsCard}>
                <Text style={styles.logsTitle}>Technical Logs</Text>
                <ScrollView style={styles.logsScroll} nestedScrollEnabled>
                  {errorDetails.logs.map((log, index) => (
                    <View key={index} style={styles.logItem}>
                      <Text style={styles.logText}>{log}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={resetScan}
            >
              <MaterialIcons name="refresh" size={24} color="white" />
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {result && !analyzing && (
          <View style={styles.resultsContainer}>
            {/* Score Circle */}
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getRiskColor(result.risk_level) },
              ]}
            >
              <Text style={[styles.scoreNumber, { color: getRiskColor(result.risk_level) }]}>
                {result.score}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>

            {/* Risk Level Badge */}
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: getRiskColor(result.risk_level) },
              ]}
            >
              <Text style={styles.riskText}>
                {result.risk_level.toUpperCase()}
              </Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>{result.summary}</Text>
            </View>

            {/* Indicators */}
            <View style={styles.indicatorsContainer}>
              <Text style={styles.indicatorsTitle}>Why This Score?</Text>
              {result.indicators.map((indicator, index) => (
                <View key={index} style={styles.indicatorCard}>
                  <View style={styles.indicatorHeader}>
                    <MaterialIcons
                      name="warning"
                      size={20}
                      color={getSeverityColor(indicator.severity)}
                    />
                    <Text style={styles.indicatorTitle}>{indicator.title}</Text>
                  </View>
                  <Text style={styles.indicatorExplanation}>
                    {indicator.explanation}
                  </Text>
                  <View
                    style={[
                      styles.severityBadge,
                      {
                        backgroundColor:
                          getSeverityColor(indicator.severity) + '20',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.severityText,
                        { color: getSeverityColor(indicator.severity) },
                      ]}
                    >
                      {indicator.severity.toUpperCase()} RISK
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Scan Another Button */}
            <TouchableOpacity
              style={styles.scanAnotherButton}
              onPress={resetScan}
            >
              <MaterialIcons name="refresh" size={24} color="white" />
              <Text style={styles.buttonText}>Scan Another</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  signInText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  historyButton: {
    padding: 8,
    marginRight: 8,
  },
  signOutButton: {
    padding: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  imageContainer: {
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#3b82f6',
    gap: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  resultsContainer: {
    alignItems: 'center',
  },
  scoreCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 18,
    color: '#6b7280',
  },
  riskBadge: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  riskText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryCard: {
    width: '100%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    color: '#4b5563',
    lineHeight: 24,
  },
  indicatorsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  indicatorsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  indicatorCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  indicatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  indicatorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  indicatorExplanation: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  severityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  scanAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  errorContainer: {
    width: '100%',
    alignItems: 'center',
  },
  errorHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginTop: 12,
  },
  errorDetailsCard: {
    width: '100%',
    backgroundColor: '#fee2e2',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#ef4444',
  },
  errorDetailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorDetailsText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
  },
  logsCard: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    maxHeight: 300,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  logsScroll: {
    maxHeight: 220,
  },
  logItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  logText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#374151',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
