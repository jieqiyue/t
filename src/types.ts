export type CategoryId = 'work' | 'life' | 'sport' | 'fun';

export type ActivityOverviewStyle = 'rank' | 'cloud';

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
  tagId: ActivityTag['id'];
  createdAt: number;
  archived?: boolean;
}

export interface Activity {
  id: string;
  itemId?: ActivityItem['id'];
  tagId?: ActivityTag['id'];
  title: string;
  category: CategoryId;
  /** epoch milliseconds for when the activity happened */
  timestamp: number;
}
