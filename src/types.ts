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
}
