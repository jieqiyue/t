import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TimelineScreen from './src/screens/TimelineScreen';
import StatsScreen from './src/screens/StatsScreen';
import AllActivitiesScreen from './src/screens/AllActivitiesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ManageItemsScreen from './src/screens/ManageItemsScreen';
import ManageTagsScreen from './src/screens/ManageTagsScreen';
import RecordDoneScreen from './src/screens/RecordDoneScreen';
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
import {
  Activity,
  ActivityItem,
  ActivityOverviewStyle,
  ActivityTag,
  CategoryId,
  NewRecordInput,
} from './src/types';
import { COLORS } from './src/theme';
import { isSameDay } from './src/dateUtils';

/**
 * Persists `value` via `save` whenever it changes — but skips the first run
 * after hydration, so freshly-loaded data isn't immediately written back.
 * `ready` should be false while loading; the skip is consumed on the first
 * ready render (the hydration commit), and real changes save from then on.
 */
function usePersist<T>(value: T, ready: boolean, save: (value: T) => void) {
  const hydrated = useRef(false);
  useEffect(() => {
    if (!ready) return;
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    save(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, ready]);
}

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
  const [justRecorded, setJustRecorded] = useState<Activity | null>(null);

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

  // Persist on change, skipping the redundant write right after hydration.
  usePersist(activities, !loading, saveActivities);
  usePersist(overviewStyle, !loading, saveActivityOverviewStyle);
  usePersist(tags, !loading, saveTags);
  usePersist(items, !loading, saveActivityItems);

  // Android hardware back: close sheet, or return to the timeline.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (justRecorded) {
        setJustRecorded(null);
        setRoute({ name: 'timeline' });
        return true;
      }
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
  }, [sheetOpen, route, justRecorded]);

  const addActivity = useCallback((input: NewRecordInput) => {
    const tag = tags.find((candidate) => candidate.id === input.tagId);
    const category = (tag?.id === 'work' || tag?.id === 'life' || tag?.id === 'sport' || tag?.id === 'fun'
      ? tag.id
      : 'life') as CategoryId;
    const entry: Activity = {
      id: `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}`,
      itemId: input.itemId,
      tagId: input.tagId,
      title: input.title,
      category,
      note: input.note,
      mood: input.mood,
      weather: input.weather,
      timestamp: Date.now(),
    };
    setActivities((prev) => [entry, ...prev]);
    setSheetOpen(false);
    setJustRecorded(entry);
  }, [tags]);

  // Deleting an item is destructive: drop the item AND every record it produced
  // (matched by itemId, or by title+tag for seeded/legacy records with no itemId).
  const deleteItem = useCallback((item: ActivityItem) => {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    setActivities((prev) =>
      prev.filter(
        (a) =>
          !(
            a.itemId === item.id ||
            (a.title === item.title && (a.tagId || a.category) === item.tagId)
          ),
      ),
    );
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
      {justRecorded ? (
        <RecordDoneScreen
          activity={justRecorded}
          tags={tags}
          todayCount={activities.filter((a) => isSameDay(new Date(a.timestamp), new Date())).length}
          onBack={() => {
            setJustRecorded(null);
            setRoute({ name: 'timeline' });
          }}
        />
      ) : route.name === 'timeline' ? (
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
          onDeleteItem={deleteItem}
          onBack={() => setRoute({ name: 'settings', from: settingsFrom })}
        />
      ) : route.name === 'manageTags' ? (
        <ManageTagsScreen
          tags={tags}
          items={items}
          activities={activities}
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
