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
import SummaryScreen from './src/screens/SummaryScreen';
import ExportScreen from './src/screens/ExportScreen';
import RecordDetailScreen from './src/screens/RecordDetailScreen';
import SearchScreen from './src/screens/SearchScreen';
import QuickRecordSheet from './src/components/QuickRecordSheet';
import { RestoredData } from './src/exporters';
import {
  loadActivities,
  loadActivityItems,
  loadActivityOverviewStyle,
  loadTags,
  loadThemeId,
  clearAllData,
  saveActivities,
  saveActivityItems,
  saveActivityOverviewStyle,
  saveTags,
  saveThemeId,
} from './src/storage';
import {
  Activity,
  ActivityItem,
  ActivityOverviewStyle,
  ActivityTag,
  CategoryId,
  NewRecordInput,
} from './src/types';
import { THEMES, ThemeId, ThemeProvider } from './src/theme';
import { isSameDay } from './src/dateUtils';
import { newId } from './src/ids';
import { activityTagKey } from './src/tagUtils';

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
  | { name: 'summary' }
  | { name: 'export' }
  | { name: 'search' }
  | { name: 'detail'; id: string; from?: 'timeline' | 'search' }
  | { name: 'stats'; title: string; from: 'timeline' | 'activities' | 'manageItems' };

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
  const [themeId, setThemeId] = useState<ThemeId>('cream');
  const theme = THEMES[themeId];

  useEffect(() => {
    Promise.all([loadActivities(), loadActivityOverviewStyle(), loadTags(), loadThemeId()]).then(
      async ([list, style, tagList, tId]) => {
        const itemList = await loadActivityItems(list);
        setActivities(list);
        setOverviewStyle(style);
        setTags(tagList);
        setItems(itemList);
        setThemeId(tId);
        setLoading(false);
      },
    );
  }, []);

  // Persist on change, skipping the redundant write right after hydration.
  usePersist(activities, !loading, saveActivities);
  usePersist(overviewStyle, !loading, saveActivityOverviewStyle);
  usePersist(tags, !loading, saveTags);
  usePersist(items, !loading, saveActivityItems);
  usePersist(themeId, !loading, saveThemeId);

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
      if (route.name === 'stats') {
        setRoute(
          route.from === 'activities'
            ? { name: 'activities' }
            : route.from === 'manageItems'
            ? { name: 'manageItems' }
            : { name: 'timeline' },
        );
        return true;
      }
      if (route.name === 'detail') {
        setRoute(route.from === 'search' ? { name: 'search' } : { name: 'timeline' });
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
      id: newId(),
      itemId: input.itemId,
      tagId: tag?.id,
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

  // Create a new event inline from the record sheet; returns its id so the
  // sheet can immediately select it.
  const createItem = useCallback((title: string, tagId?: ActivityTag['id']): string => {
    const id = newId('item-');
    setItems((prev) => [{ id, title, tagId, createdAt: Date.now() }, ...prev]);
    return id;
  }, []);

  // Delete a single logged record from the timeline.
  const deleteActivity = useCallback((id: string) => {
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // Edit a record's note / mood / weather / time.
  const updateActivity = useCallback((updated: Activity) => {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  // Deleting an item is destructive: drop the item AND every record it produced
  // (matched by itemId, or by title+tag for seeded/legacy records with no itemId).
  const deleteItem = useCallback((item: ActivityItem) => {
    setItems((prev) => prev.filter((it) => it.id !== item.id));
    setActivities((prev) =>
      prev.filter(
        (a) =>
          !(
            a.itemId === item.id ||
            (!a.itemId && a.title === item.title && activityTagKey(a) === item.tagId)
          ),
      ),
    );
  }, []);

  const restoreData = useCallback((data: RestoredData) => {
    setActivities(data.activities);
    setItems(data.items);
    if (data.tags.length) setTags(data.tags);
    setRoute({ name: 'timeline' });
  }, []);

  const handleClearAllData = useCallback(async () => {
    await clearAllData();
    setActivities([]);
    setItems([]);
    setTags([]);
    setOverviewStyle('rank');
    setThemeId('cream');
    setSheetOpen(false);
    setJustRecorded(null);
    setRoute({ name: 'timeline' });
  }, []);

  const detailActivity =
    route.name === 'detail' ? activities.find((a) => a.id === route.id) ?? null : null;

  // If the record being viewed disappears (deleted / restored), leave the detail screen.
  useEffect(() => {
    if (route.name === 'detail' && !activities.find((a) => a.id === route.id)) {
      setRoute(route.from === 'search' ? { name: 'search' } : { name: 'timeline' });
    }
  }, [route, activities]);

  if (loading) {
    return (
      <View style={[styles.loader, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
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
          onOpenDetail={(id) => setRoute({ name: 'detail', id })}
          onOpenAllActivities={() => setRoute({ name: 'activities' })}
          onOpenSettings={() => {
            setSettingsFrom('timeline');
            setRoute({ name: 'settings', from: 'timeline' });
          }}
          onOpenRecord={() => setSheetOpen(true)}
          onDeleteActivity={deleteActivity}
          onOpenSummary={() => setRoute({ name: 'summary' })}
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
          onOpenStats={(title) => setRoute({ name: 'stats', title, from: 'activities' })}
          onOpenSearch={() => setRoute({ name: 'search' })}
        />
      ) : route.name === 'settings' ? (
        <SettingsScreen
          overviewStyle={overviewStyle}
          onChangeOverviewStyle={setOverviewStyle}
          themeId={themeId}
          onChangeTheme={setThemeId}
          onOpenManageItems={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageItems' });
          }}
          onOpenManageTags={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageTags' });
          }}
          onOpenExport={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'export' });
          }}
          onClearAllData={handleClearAllData}
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
          onOpenStats={(title) => setRoute({ name: 'stats', title, from: 'manageItems' })}
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
      ) : route.name === 'summary' ? (
        <SummaryScreen
          activities={activities}
          tags={tags}
          onBack={() => setRoute({ name: 'timeline' })}
        />
      ) : route.name === 'export' ? (
        <ExportScreen
          activities={activities}
          items={items}
          tags={tags}
          themeId={themeId}
          overviewStyle={overviewStyle}
          onRestore={restoreData}
          onBack={() => setRoute({ name: 'settings', from: settingsFrom })}
        />
      ) : route.name === 'search' ? (
        <SearchScreen
          activities={activities}
          tags={tags}
          onOpenDetail={(id) => setRoute({ name: 'detail', id, from: 'search' })}
          onBack={() => setRoute({ name: 'activities' })}
        />
      ) : route.name === 'detail' ? (
        detailActivity ? (
          <RecordDetailScreen
            activity={detailActivity}
            tags={tags}
            onUpdate={updateActivity}
            onDelete={(id) => {
              const backToSearch = route.name === 'detail' && route.from === 'search';
              deleteActivity(id);
              setRoute(backToSearch ? { name: 'search' } : { name: 'timeline' });
            }}
            onOpenStats={(title) => setRoute({ name: 'stats', title, from: 'timeline' })}
            onBack={() =>
              setRoute(
                route.name === 'detail' && route.from === 'search'
                  ? { name: 'search' }
                  : { name: 'timeline' },
              )
            }
          />
        ) : null
      ) : (
        <StatsScreen
          title={route.title}
          activities={activities}
          tags={tags}
          onBack={() =>
            setRoute(
              route.from === 'activities'
                ? { name: 'activities' }
                : route.from === 'manageItems'
                ? { name: 'manageItems' }
                : { name: 'timeline' },
            )
          }
        />
      )}
      <QuickRecordSheet
        visible={sheetOpen}
        items={items}
        tags={tags}
        onClose={() => setSheetOpen(false)}
        onSubmit={addActivity}
        onAddItem={createItem}
      />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
