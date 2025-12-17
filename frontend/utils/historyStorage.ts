import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryItem {
  id: string;
  timestamp: number;
  imageUri: string;
  imageBase64: string;
  analysis?: {
    score: number;
    risk_level: 'safe' | 'suspicious' | 'scam';
    indicators: Array<{
      title: string;
      explanation: string;
      severity: 'low' | 'medium' | 'high';
    }>;
    summary: string;
  };
  error?: {
    error: string;
    details: string;
    logs: string[];
  };
}

const HISTORY_KEY = '@scam_detector_history';
const MAX_HISTORY_ITEMS = 50; // Keep last 50 scans

export const saveToHistory = async (item: Omit<HistoryItem, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const history = await getHistory();
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      ...item,
    };

    // Add to beginning of array
    const updatedHistory = [newItem, ...history];

    // Keep only the most recent items
    const trimmedHistory = updatedHistory.slice(0, MAX_HISTORY_ITEMS);

    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error saving to history:', error);
  }
};

export const getHistory = async (): Promise<HistoryItem[]> => {
  try {
    const historyJson = await AsyncStorage.getItem(HISTORY_KEY);
    if (historyJson) {
      return JSON.parse(historyJson);
    }
    return [];
  } catch (error) {
    console.error('Error getting history:', error);
    return [];
  }
};

export const deleteHistoryItem = async (id: string): Promise<void> => {
  try {
    const history = await getHistory();
    const updatedHistory = history.filter(item => item.id !== id);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error deleting history item:', error);
  }
};

export const clearHistory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Error clearing history:', error);
  }
};
