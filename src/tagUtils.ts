import { Palette, resolveTag, TagView, UNTAGGED_LABEL } from './theme';
import { Activity, ActivityTag } from './types';

export function untaggedView(palette: Palette): TagView {
  return { dot: palette.muted3, text: palette.muted, soft: palette.inputBg, label: UNTAGGED_LABEL };
}

export function resolveOptionalTag(
  palette: Palette,
  tags: ActivityTag[],
  tagId?: ActivityTag['id'],
): TagView {
  return tagId ? resolveTag(palette, tags, tagId) : untaggedView(palette);
}

export function resolveActivityTag(
  palette: Palette,
  tags: ActivityTag[],
  activity: Activity,
): TagView {
  return resolveOptionalTag(palette, tags, activityTagKey(activity));
}

/**
 * The tag id a record should be grouped/displayed under: its own tagId, else
 * (for legacy pre-itemId records) its category, else undefined for new no-tag
 * records. Single source of truth for both display and grouping/export keys.
 */
export function activityTagKey(activity: Activity): ActivityTag['id'] | undefined {
  if (activity.tagId) return activity.tagId;
  return activity.itemId ? undefined : activity.category;
}
