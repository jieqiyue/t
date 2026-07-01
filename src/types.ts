export type CategoryId = 'work' | 'life' | 'sport' | 'fun';

export type ActivityOverviewStyle = 'rank' | 'cloud';

export type MoodId = 'great' | 'good' | 'ok' | 'down' | 'bad';

export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'snow';

export interface ActivityTag {
  id: CategoryId | string;
  label: string;
  dot: string;
  text: string;
  soft: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  tagId?: ActivityTag['id'];
  createdAt: number;
  pinned?: boolean;
  archived?: boolean;
  /** Custom sort position (lower = higher in list). Absent = use createdAt fallback. */
  sortOrder?: number;
}

/** A captured location: always coordinates, plus a human-readable label when
 *  reverse-geocoding succeeds (label is absent on web / when it can't resolve). */
export interface ActivityLocation {
  lat: number;
  lng: number;
  label?: string;
}

export interface Activity {
  id: string;
  itemId?: ActivityItem['id'];
  tagId?: ActivityTag['id'];
  title: string;
  category: CategoryId;
  /** optional free-text note — "what you want to say right now" */
  note?: string;
  mood?: MoodId;
  weather?: WeatherId;
  location?: ActivityLocation;
  /** local file:// URI to an attached photo. Files live under
   *  FileSystem.documentDirectory + "attachments/"; absent = no photo. */
  photo?: string;
  /** epoch milliseconds for when the activity happened */
  timestamp: number;
}

/** Payload produced by the quick-record sheet. An event is required; the rest optional. */
export interface NewRecordInput {
  itemId: ActivityItem['id'];
  title: string;
  tagId?: ActivityTag['id'];
  note?: string;
  mood?: MoodId;
  weather?: WeatherId;
  location?: ActivityLocation;
  photo?: string;
}
