import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TimelineScreen from './src/screens/TimelineScreen';
import StatsScreen from './src/screens/StatsScreen';
import QuickRecordSheet from './src/components/QuickRecordSheet';
import { loadActivities, saveActivities } from './src/storage';
import { Activity, CategoryId } from './src/types';
import { COLORS } from './src/theme';

type Route = { name: 'timeline' } | { name: 'stats'; title: string };

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'timeline' });
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    loadActivities().then((list) => {
      setActivities(list);
      setLoading(false);
    });
  }, []);

  // Persist whenever the list changes (after initial load).
  useEffect(() => {
    if (!loading) saveActivities(activities);
  }, [activities, loading]);

  // Android hardware back: close sheet, or return to the timeline.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheetOpen) {
        setSheetOpen(false);
        return true;
      }
      if (route.name !== 'timeline') {
        setRoute({ name: 'timeline' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [sheetOpen, route]);

  const addActivity = useCallback((title: string, category: CategoryId) => {
    const entry: Activity = {
      id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
      title,
      category,
      timestamp: Date.now(),
    };
    setActivities((prev) => [entry, ...prev]);
    setSheetOpen(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {route.name === 'timeline' ? (
        <TimelineScreen
          activities={activities}
          onOpenStats={(title) => setRoute({ name: 'stats', title })}
          onOpenRecord={() => setSheetOpen(true)}
        />
      ) : (
        <StatsScreen
          title={route.title}
          activities={activities}
          onBack={() => setRoute({ name: 'timeline' })}
        />
      )}
      <QuickRecordSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onSubmit={addActivity}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
});
