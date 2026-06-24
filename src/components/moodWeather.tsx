import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { MoodId, WeatherId } from '../types';

export const MOODS: { id: MoodId; label: string }[] = [
  { id: 'great', label: '很好' },
  { id: 'good', label: '不错' },
  { id: 'ok', label: '一般' },
  { id: 'down', label: '低落' },
  { id: 'bad', label: '糟糕' },
];

export const WEATHERS: { id: WeatherId; label: string; color: string }[] = [
  { id: 'sunny', label: '晴', color: '#C2B49C' },
  { id: 'cloudy', label: '多云', color: '#C3BBAC' },
  { id: 'rain', label: '雨', color: '#9FB0BE' },
  { id: 'snow', label: '雪', color: '#AFC0CC' },
];

export const MOOD_MAP: Record<MoodId, { id: MoodId; label: string }> = MOODS.reduce(
  (acc, m) => {
    acc[m.id] = m;
    return acc;
  },
  {} as Record<MoodId, { id: MoodId; label: string }>,
);

export const WEATHER_MAP: Record<WeatherId, { id: WeatherId; label: string; color: string }> =
  WEATHERS.reduce(
    (acc, w) => {
      acc[w.id] = w;
      return acc;
    },
    {} as Record<WeatherId, { id: WeatherId; label: string; color: string }>,
  );

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
