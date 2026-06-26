import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { dayKey } from './dateUtils';

function startOfToday(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * The current calendar day, as a start-of-day Date. It refreshes when the clock
 * crosses midnight: both when the app returns to the foreground (the common
 * mobile case — backgrounded at night, resumed the next morning) and, if the
 * app stays open, via a timer scheduled for the next midnight.
 *
 * The returned Date reference only changes when the day actually changes, so it
 * is safe to use in `useMemo` / effect dependency arrays without churning.
 */
export function useToday(): Date {
  const [today, setToday] = useState(startOfToday);
  const todayRef = useRef(today);
  todayRef.current = today;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const now = startOfToday();
      if (dayKey(now) !== dayKey(todayRef.current)) setToday(now);
      schedule();
    };

    const schedule = () => {
      clearTimeout(timer);
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
      timer = setTimeout(tick, nextMidnight - now.getTime() + 1000);
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    schedule();

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return today;
}
