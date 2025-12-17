import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getHistory, deleteHistoryItem, clearHistory, HistoryItem } from '../utils/historyStorage';

export default function HistoryScreen() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    const items = await getHistory();
    setHistory(items);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Scan',
      'Are you sure you want to delete this scan?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHistoryItem(id);
            await loadHistory();
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete all scan history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearHistory();
            await loadHistory();
          },
        },
      ]
    );
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

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderItem = ({ item }: { item: HistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => router.push({ pathname: '/history-detail', params: { id: item.id } })}
    >
      <Image source={{ uri: item.imageUri }} style={styles.thumbnail} />
      <View style={styles.itemContent}>
        <View style={styles.itemHeader}>
          {item.analysis ? (
            <View style={styles.scoreContainer}>
              <Text
                style={[
                  styles.scoreText,
                  { color: getRiskColor(item.analysis.risk_level) },
                ]}
              >
                {item.analysis.score}
              </Text>
              <View
                style={[
                  styles.riskPill,
                  { backgroundColor: getRiskColor(item.analysis.risk_level) },
                ]}
              >
                <Text style={styles.riskPillText}>
                  {item.analysis.risk_level.toUpperCase()}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.errorIndicator}>
              <MaterialIcons name="error" size={20} color="#ef4444" />
              <Text style={styles.errorText}>Failed</Text>
            </View>
          )}
          <Text style={styles.timestamp}>{formatDate(item.timestamp)}</Text>
        </View>
        {item.analysis && (
          <Text style={styles.summary} numberOfLines={2}>
            {item.analysis.summary}
          </Text>
        )}
        {item.error && (
          <Text style={styles.errorSummary} numberOfLines={2}>
            {item.error.error}: {item.error.details}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          handleDelete(item.id);
        }}
        style={styles.deleteButton}
      >
        <MaterialIcons name="delete" size={24} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Scan History</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="history" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Scan History</Text>
          <Text style={styles.emptyText}>
            Your previous scans will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  riskPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  riskPillText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  errorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  summary: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  errorSummary: {
    fontSize: 12,
    color: '#ef4444',
    lineHeight: 18,
  },
  deleteButton: {
    padding: 8,
    justifyContent: 'center',
  },
});
