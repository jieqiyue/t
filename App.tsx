import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TimelineScreen from './src/screens/TimelineScreen';
import StatsScreen from './src/screens/StatsScreen';
import AllActivitiesScreen, { ActivityFilter } from './src/screens/AllActivitiesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ManageItemsScreen from './src/screens/ManageItemsScreen';
import ManageTagsScreen from './src/screens/ManageTagsScreen';
import BatchTagScreen from './src/screens/BatchTagScreen';
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
import {
  applyReminderConfig,
  DEFAULT_REMINDER,
  initNotifications,
  loadReminderConfig,
  ReminderConfig,
  saveReminderConfig,
} from './src/reminder';
import { cleanupOrphanPhotos, deletePhotoFile } from './src/photoUtils';

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
  | { name: 'batchTag' }
  | { name: 'summary' }
  | { name: 'export' }
  | { name: 'search' }
  | { name: 'detail'; id: string; from?: 'timeline' | 'search' | 'activities' }
  | { name: 'stats'; title: string; from: 'timeline' | 'activities' | 'manageItems' };

/** Where the detail screen returns to, based on where it was opened from. */
function detailReturn(from?: 'timeline' | 'search' | 'activities'): Route {
  if (from === 'search') return { name: 'search' };
  if (from === 'activities') return { name: 'activities' };
  return { name: 'timeline' };
}

/** Whether the user already logged at least one record on `now`'s calendar day. */
function hasRecordToday(activities: Activity[], now: Date): boolean {
  const startMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endMs = startMs + 86400000;
  return activities.some((a) => a.timestamp >= startMs && a.timestamp < endMs);
}

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
  const [reminder, setReminder] = useState<ReminderConfig>(DEFAULT_REMINDER);
  const theme = THEMES[themeId];

  // 全部活动 view state — kept here so it survives navigating into a record's
  // detail and back (the open day re-opens on return). Reset on a fresh open.
  const [actTab, setActTab] = useState<'calendar' | 'rank' | 'cloud'>('calendar');
  const [actView, setActView] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [actDay, setActDay] = useState<number | null>(null);
  const [actFilter, setActFilter] = useState<ActivityFilter>({ type: 'all' });

  const openAllActivities = useCallback(() => {
    const d = new Date();
    setActTab('calendar');
    setActView({ y: d.getFullYear(), m: d.getMonth() });
    setActDay(null);
    setActFilter({ type: 'all' });
    setRoute({ name: 'activities' });
  }, []);

  useEffect(() => {
    initNotifications();
    Promise.all([
      loadActivities(),
      loadActivityOverviewStyle(),
      loadTags(),
      loadThemeId(),
      loadReminderConfig(),
    ]).then(async ([list, style, tagList, tId, rem]) => {
      const itemList = await loadActivityItems(list);
      setActivities(list);
      setOverviewStyle(style);
      setTags(tagList);
      setItems(itemList);
      setThemeId(tId);
      setReminder(rem);
      setLoading(false);
      // Re-apply scheduled reminder on every cold start (the OS may have
      // dropped pending alarms on reboot, OEM cleanup, etc.). Skip today
      // if the user already recorded before opening the app.
      if (rem.enabled) applyReminderConfig(rem, hasRecordToday(list, new Date()));
      // Sweep orphaned photo files (e.g. from records deleted while the app
      // wasn't running, or attachments left over from earlier bugs).
      cleanupOrphanPhotos(list);
    });
  }, []);

  // Reschedule the reminder whenever activities change, so today's fire is
  // suppressed as soon as the user records (and re-enabled if they delete
  // today's only record). Deliberately excludes `reminder` — that path is
  // handled explicitly by handleChangeReminder to keep permission-prompt
  // logic centralised.
  useEffect(() => {
    if (loading || !reminder.enabled) return;
    applyReminderConfig(reminder, hasRecordToday(activities, new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, loading]);

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
        setRoute(detailReturn(route.from));
        return true;
      }
      if (route.name === 'manageItems' || route.name === 'manageTags' || route.name === 'batchTag' || route.name === 'export') {
        setRoute({ name: 'settings', from: settingsFrom });
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
      location: input.location,
      photo: input.photo,
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
    setActivities((prev) => {
      const gone = prev.find((a) => a.id === id);
      if (gone?.photo) deletePhotoFile(gone.photo);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  // Edit a record's note / mood / weather / time.
  const updateActivity = useCallback((updated: Activity) => {
    setActivities((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  }, []);

  const duplicateActivity = useCallback((activity: Activity) => {
    const copy: Activity = {
      ...activity,
      id: newId(),
      timestamp: Date.now(),
    };
    setActivities((prev) => [copy, ...prev]);
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

  // Rename an item AND re-title every record it produced (same matching rule as
  // deleteItem: by itemId, or title+tag for legacy records without an itemId).
  const renameItem = useCallback((item: ActivityItem, newTitle: string) => {
    const title = newTitle.trim();
    if (!title) return;
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, title } : it)));
    setActivities((prev) =>
      prev.map((a) =>
        a.itemId === item.id ||
        (!a.itemId && a.title === item.title && activityTagKey(a) === item.tagId)
          ? { ...a, title }
          : a,
      ),
    );
  }, []);

  // Batch-set tag for multiple untagged records.
  const batchSetTag = useCallback((ids: string[], tagId: ActivityTag['id']) => {
    const tag = tags.find((t) => t.id === tagId);
    const category = (tag?.id === 'work' || tag?.id === 'life' || tag?.id === 'sport' || tag?.id === 'fun'
      ? tag.id
      : 'life') as CategoryId;
    setActivities((prev) =>
      prev.map((a) => {
        if (!ids.includes(a.id)) return a;
        // If the record has no tagId and no legacy category, set both.
        return { ...a, tagId, category };
      }),
    );
  }, [tags]);

  const restoreData = useCallback((data: RestoredData) => {
    setActivities(data.activities);
    setItems(data.items);
    if (data.tags.length) setTags(data.tags);
    setRoute({ name: 'timeline' });
  }, []);

  const handleClearAllData = useCallback(async () => {
    // Delete every attached photo file before wiping metadata.
    await Promise.all(activities.filter((a) => a.photo).map((a) => deletePhotoFile(a.photo)));
    await clearAllData();
    setActivities([]);
    setItems([]);
    setTags([]);
    setOverviewStyle('rank');
    setThemeId('cream');
    setReminder(DEFAULT_REMINDER);
    await applyReminderConfig(DEFAULT_REMINDER, false);
    setSheetOpen(false);
    setJustRecorded(null);
    setRoute({ name: 'timeline' });
  }, [activities]);

  const handleChangeReminder = useCallback(async (next: ReminderConfig) => {
    const effectiveEnabled = await applyReminderConfig(next, hasRecordToday(activities, new Date()));
    const resolved: ReminderConfig = { ...next, enabled: effectiveEnabled };
    setReminder(resolved);
    await saveReminderConfig(resolved);
  }, [activities]);

  const detailActivity =
    route.name === 'detail' ? activities.find((a) => a.id === route.id) ?? null : null;

  // If the record being viewed disappears (deleted / restored), leave the detail screen.
  useEffect(() => {
    if (route.name === 'detail' && !activities.find((a) => a.id === route.id)) {
      setRoute(detailReturn(route.from));
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
          onOpenAllActivities={openAllActivities}
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
          tab={actTab}
          onChangeTab={setActTab}
          view={actView}
          onChangeView={setActView}
          selectedDay={actDay}
          onSelectDay={setActDay}
          filter={actFilter}
          onChangeFilter={setActFilter}
          onBack={() => setRoute({ name: 'timeline' })}
          onOpenSettings={() => {
            setSettingsFrom('activities');
            setRoute({ name: 'settings', from: 'activities' });
          }}
          onOpenStats={(title) => setRoute({ name: 'stats', title, from: 'activities' })}
          onOpenSearch={() => setRoute({ name: 'search' })}
          onOpenDetail={(id) => setRoute({ name: 'detail', id, from: 'activities' })}
        />
      ) : route.name === 'settings' ? (
        <SettingsScreen
          overviewStyle={overviewStyle}
          onChangeOverviewStyle={setOverviewStyle}
          themeId={themeId}
          onChangeTheme={setThemeId}
          reminder={reminder}
          onChangeReminder={handleChangeReminder}
          onOpenManageItems={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageItems' });
          }}
          onOpenManageTags={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'manageTags' });
          }}
          onOpenBatchTag={() => {
            setSettingsFrom(route.from);
            setRoute({ name: 'batchTag' });
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
          onChangeItems={(nextItems) => {
            // Detect tagId changes and propagate to related activities.
            setActivities((prev) => {
              const patched = prev.map((a) => {
                // Only activities with an itemId can be reliably matched.
                if (!a.itemId) return a;
                const oldItem = items.find((it) => it.id === a.itemId);
                const newItem = nextItems.find((it) => it.id === a.itemId);
                if (!oldItem || !newItem) return a;
                // tagId unchanged — nothing to do.
                if ((oldItem.tagId ?? undefined) === (newItem.tagId ?? undefined)) return a;
                const tag = tags.find((t) => t.id === newItem.tagId);
                const category = (tag?.id === 'work' || tag?.id === 'life' || tag?.id === 'sport' || tag?.id === 'fun'
                  ? tag.id
                  : 'life') as CategoryId;
                return { ...a, tagId: newItem.tagId ?? undefined, category };
              });
              return patched;
            });
            setItems(nextItems);
          }}
          onDeleteItem={deleteItem}
          onRenameItem={renameItem}
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
      ) : route.name === 'batchTag' ? (
        <BatchTagScreen
          activities={activities}
          tags={tags}
          onBatchSetTag={batchSetTag}
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
            items={items}
            tags={tags}
            onUpdate={updateActivity}
            onDuplicate={duplicateActivity}
            onDelete={(id) => {
              const back = route.name === 'detail' ? detailReturn(route.from) : { name: 'timeline' as const };
              deleteActivity(id);
              setRoute(back);
            }}
            onOpenStats={(title) => setRoute({ name: 'stats', title, from: 'timeline' })}
            onBack={() =>
              setRoute(route.name === 'detail' ? detailReturn(route.from) : { name: 'timeline' })
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
