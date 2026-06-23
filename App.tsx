import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TimelineScreen from './src/screens/TimelineScreen';
import StatsScreen from './src/screens/StatsScreen';
import AllActivitiesScreen from './src/screens/AllActivitiesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ManageItemsScreen from './src/screens/ManageItemsScreen';
import ManageTagsScreen from './src/screens/ManageTagsScreen';
import QuickRecordSheet from './src/components/QuickRecordSheet';
import {
  loadActivities,
  loadActivityItems,
  loadActivityOverviewStyle,
  loadTags,
  saveActivities,
  saveActivityItems,
  saveActivityOverviewStyle,
  saveTags,
} from './src/storage';
import { Activity, ActivityItem, ActivityOverviewStyle, ActivityTag, CategoryId } from './src/types';
import { COLORS } from './src/theme';

type Route =
  | { name: 'timeline' }
  | { name: 'activities' }
  | { name: 'settings'; from: 'timeline' | 'activities' }
  | { name: 'manageItems' }
  | { name: 'manageTags' }
  | { name: 'stats'; title: string };

export default function App() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState<Route>({ name: 'timeline' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [overviewStyle, setOverviewStyle] = useState<ActivityOverviewStyle>('rank');
  const [tags, setTags] = useState<ActivityTag[]>([]);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [settingsFrom, setSettingsFrom] = useState<'timeline' | 'activities'>('timeline');

  useEffect(() => {
    Promise.all([loadActivities(), loadActivityOverviewStyle(), loadTags()]).then(async ([list, style, tagList]) => {
      const itemList = await loadActivityItems(list);
      setActivities(list);
      setOverviewStyle(style);
      setTags(tagList);
      setItems(itemList);
      setLoading(false);
    });
  }, []);

  // Persist whenever the list changes (after initial load).
  useEffect(() => {
    if (!loading) saveActivities(activities);
  }, [activities, loading]);

  useEffect(() => {
    if (!loading) saveActivityOverviewStyle(overviewStyle);
  }, [overviewStyle, loading]);

  useEffect(() => {
    if (!loading) saveTags(tags);
  }, [tags, loading]);

  useEffect(() => {
    if (!loading) saveActivityItems(items);
  }, [items, loading]);

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

  const addActivity = useCallback((item: ActivityItem) => {
    const tag = tags.find((candidate) => candidate.id === item.tagId);
    const category = (tag?.id === 'work' || tag?.id === 'life' || tag?.id === 'sport' || tag?.id === 'fun'
      ? tag.id
      : 'life') as CategoryId;
    const entry: Activity = {
      id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
      itemId: item.id,
      tagId: item.tagId,
      title: item.title,
      category,
      timestamp: Date.now(),
    };
    setActivities((prev) => [entry, ...prev]);
    setSheetOpen(false);
  }, [tags]);

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
          tags={tags}
          onOpenStats={(title) => setRoute({ name: 'stats', title })}
          onOpenAllActivities={() => setRoute({ name: 'activities' })}
          onOpenSettings={() => {
            setSettingsFrom('timeline');
            setRoute({ name: 'settings', from: 'timeline' });
          }}
          onOpenRecord={() => setSheetOpen(true)}
        />
      ) : route.name === 'activities' ? (
        <AllActivitiesScreen
          activities={activities}
          tags={tags}
          overviewStyle={overviewStyle}
          onBack={() => setRoute({ name: 'timeline' })}
          onOpenSettings={() => {
            setSettingsFrom('activities');
            setRoute({ name: 'settings', from: 'activities' });
          }}
          onOpenStats={(title) => setRoute({ name: 'stats', title })}
        />
      ) : route.name === 'settings' ? (
        <SettingsScreen
          overviewStyle={overviewStyle}
          onChangeOverviewStyle={setOverviewStyle}
          onOpenManageItems={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageItems' });
          }}
          onOpenManageTags={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageTags' });
          }}
          onBack={() =>
            setRoute(route.from === 'timeline' ? { name: 'timeline' } : { name: 'activities' })
          }
        />
      ) : route.name === 'manageItems' ? (
        <ManageItemsScreen
          items={items}
          tags={tags}
          onChangeItems={setItems}
          onBack={() => setRoute({ name: 'settings', from: settingsFrom })}
        />
      ) : route.name === 'manageTags' ? (
        <ManageTagsScreen
          tags={tags}
          items={items}
          onChangeTags={setTags}
          onBack={() => setRoute({ name: 'settings', from: settingsFrom })}
        />
      ) : (
        <StatsScreen
          title={route.title}
          activities={activities}
          tags={tags}
          onBack={() => setRoute({ name: 'timeline' })}
        />
      )}
      <QuickRecordSheet
        visible={sheetOpen}
        items={items}
        tags={tags}
        onClose={() => setSheetOpen(false)}
        onSubmit={addActivity}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg },
});
