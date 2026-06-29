import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { MoodId, WeatherId } from '../types';

// Mood / weather metadata lives in one pure module; import (for local use) and re-export.
import { MOODS, WEATHERS, MOOD_MAP, WEATHER_MAP, MOOD_DIST_COLOR } from '../moods';
export { MOODS, WEATHERS, MOOD_MAP, WEATHER_MAP, MOOD_DIST_COLOR };

/** A small Morandi line-art face for a mood. `color` drives eyes + mouth. */
export function MoodFace({ id, color, size = 20 }: { id: MoodId; color: string; size?: number }) {
  const sw = size <= 12 ? 1.9 : 1.7;
  const eye = (cx: number, cy: number, r = 1.35) => (
    <Circle cx={cx} cy={cy} r={r} fill={color} />
  );
  const mouth = (d: string) => (
    <Path d={d} stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
  );

  // Mouth curves use 'q dx dy ...': positive dy bows the middle downward = smile,
  // negative dy bows it upward = frown.
  let eyes = (
    <>
      {eye(8.5, 10)}
      {eye(15.5, 10)}
    </>
  );
  let m = 'M8.3 15 h7.4';
  if (id === 'great') m = 'M8 14.8 q4 2.9 8 0';
  else if (id === 'good') m = 'M8.2 15 q3.8 1.8 7.6 0';
  else if (id === 'ok') m = 'M8.3 15 h7.4';
  else if (id === 'down') {
    eyes = (
      <>
        {eye(8.5, 10.5)}
        {eye(15.5, 10.5)}
      </>
    );
    m = 'M8 15.5 q4 -2 8 0';
  } else if (id === 'bad') {
    eyes = (
      <>
        <Path d="M7.2 9.6 l2 1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
        <Path d="M16.8 9.6 l-2 1" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
      </>
    );
    m = 'M8 15.8 q4 -2.6 8 0';
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {eyes}
      {mouth(m)}
    </Svg>
  );
}

/** A small Morandi weather glyph. `color` overrides the default tint. */
export function WeatherIcon({ id, color, size = 15 }: { id: WeatherId; color?: string; size?: number }) {
  const c = color || WEATHER_MAP[id].color;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {id === 'sunny' && (
        <>
          <Circle cx={12} cy={12} r={4.5} fill={c} />
          <Path
            d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
            stroke={c}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        </>
      )}
      {id === 'cloudy' && (
        <Path d="M7 17h9a3.5 3.5 0 0 0 .3-6.98A5 5 0 0 0 6.5 11 3 3 0 0 0 7 17z" fill={c} />
      )}
      {id === 'rain' && (
        <>
          <Path d="M7 14h9a3.3 3.3 0 0 0 .3-6.6A4.8 4.8 0 0 0 6.6 8 2.9 2.9 0 0 0 7 14z" fill={c} />
          <Path
            d="M9 17l-1 3M13 17l-1 3M17 17l-1 3"
            stroke={c}
            strokeWidth={1.7}
            strokeLinecap="round"
          />
        </>
      )}
      {id === 'snow' && (
        <>
          <Path d="M7 13h9a3.3 3.3 0 0 0 .3-6.6A4.8 4.8 0 0 0 6.6 7 2.9 2.9 0 0 0 7 13z" fill={c} />
          <Circle cx={9} cy={18} r={1.1} fill={c} />
          <Circle cx={13} cy={19.5} r={1.1} fill={c} />
          <Circle cx={16} cy={18} r={1.1} fill={c} />
        </>
      )}
    </Svg>
  );
}

/** Funnel glyph for the filter entry. `filled` tints it when a filter is active. */
export function FilterIcon({ color = '#FFFFFF', size = 15, filled = false }: { color?: string; size?: number; filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 5h16l-6 7v6l-4 2v-8L4 5z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : 'none'}
      />
    </Svg>
  );
}

/** Magnifier glyph for the search entry. */
export function SearchIcon({ color = '#FFFFFF', size = 18 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={11} cy={11} r={6.5} stroke={color} strokeWidth={1.9} />
      <Path d="M16 16l4 4" stroke={color} strokeWidth={1.9} strokeLinecap="round" />
    </Svg>
  );
}

/** Star glyph used by the summary entry and card badge. */
export function StarIcon({ color = '#FFFFFF', size = 20 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 3l2.2 5.6 6 .4-4.6 3.9 1.5 5.8L12 15.9 6.4 18.7l1.5-5.8L3.3 9l6-.4z"
        fill={color}
      />
    </Svg>
  );
}

/** Upload / share glyph. */
export function ShareIcon({ color = '#FFFFFF', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 14V4M12 4L8.5 7.5M12 4l3.5 3.5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Download / import glyph. */
export function DownloadIcon({ color = '#FFFFFF', size = 16 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 4v10M12 14L8.5 10.5M12 14l3.5-3.5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke={color}
        strokeWidth={1.9}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Big success checkmark for the completion screen. */
export function CheckIcon({ color = '#FFFFFF', size = 32 }: { color?: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
