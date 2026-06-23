export type CategoryId = 'work' | 'life' | 'sport' | 'fun';

export interface Activity {
  id: string;
  title: string;
  category: CategoryId;
  /** epoch milliseconds for when the activity happened */
  timestamp: number;
}
