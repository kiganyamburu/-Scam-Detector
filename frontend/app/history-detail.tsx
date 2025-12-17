import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getHistory, HistoryItem } from '../utils/historyStorage';

export default function HistoryDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<HistoryItem | null>(null);

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    const history = await getHistory();
    const foundItem = history.find((h) => h.id === id);
    if (foundItem) {
      setItem(foundItem);
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Scan Details</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Timestamp */}
        <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUri }} style={styles.image} />
        </View>

        {/* Analysis Results */}
        {item.analysis && (
          <View style={styles.resultsContainer}>
            {/* Score Circle */}
            <View
              style={[
                styles.scoreCircle,
                { borderColor: getRiskColor(item.analysis.risk_level) },
              ]}
            >
              <Text
                style={[
                  styles.scoreNumber,
                  { color: getRiskColor(item.analysis.risk_level) },
                ]}
              >
                {item.analysis.score}
              </Text>
              <Text style={styles.scoreLabel}>/ 100</Text>
            </View>

            {/* Risk Level Badge */}
            <View
              style={[
                styles.riskBadge,
                { backgroundColor: getRiskColor(item.analysis.risk_level) },
              ]}
            >
              <Text style={styles.riskText}>
                {item.analysis.risk_level.toUpperCase()}
              </Text>
            </View>

            {/* Summary */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Summary</Text>
              <Text style={styles.summaryText}>{item.analysis.summary}</Text>
            </View>

            {/* Indicators */}
            <View style={styles.indicatorsContainer}>
              <Text style={styles.indicatorsTitle}>Why This Score?</Text>
              {item.analysis.indicators.map((indicator, index) => (
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
          </View>
        )}

        {/* Error Details */}
        {item.error && (
          <View style={styles.errorContainer}>
            <View style={styles.errorHeader}>
              <MaterialIcons name="error" size={48} color="#ef4444" />
              <Text style={styles.errorTitle}>{item.error.error}</Text>
            </View>

            <View style={styles.errorDetailsCard}>
              <Text style={styles.errorDetailsTitle}>What Happened?</Text>
              <Text style={styles.errorDetailsText}>{item.error.details}</Text>
            </View>

            {item.error.logs && item.error.logs.length > 0 && (
              <View style={styles.logsCard}>
                <Text style={styles.logsTitle}>Technical Logs</Text>
                {item.error.logs.map((log, index) => (
                  <View key={index} style={styles.logItem}>
                    <Text style={styles.logText}>{log}</Text>
                  </View>
                ))}
              </View>
            )}
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
  scrollContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  timestamp: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
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
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
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
    fontFamily: 'monospace',
    color: '#374151',
  },
});
