import React, { useCallback, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, View } from 'react-native';

/** Generic item for the reorderable list – must have a stable `id`. */
export interface DragItem {
  id: string;
}

interface Props<T extends DragItem> {
  data: T[];
  onReorder: (data: T[]) => void;
  renderItem: (item: T, index: number, canMoveUp: boolean, canMoveDown: boolean) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

/**
 * A reorderable list where each row has up/down controls via renderItem.
 * When a swap is triggered externally (via moveItemInList + onReorder),
 * this component applies a shift animation to the swapping rows.
 */
export default function DraggableList<T extends DragItem>({
  data,
  onReorder,
  renderItem,
  keyExtractor,
}: Props<T>) {
  const [shifting, setShifting] = useState<{ upIdx: number; downIdx: number } | null>(null);
  const shiftAnim = useRef(new Animated.Value(0));

  const onLayout = useCallback((_index: number, _event: LayoutChangeEvent) => {}, []);

  return (
    <View>
      {data.map((item, index) => {
        const key = keyExtractor(item);
        const canMoveUp = index > 0;
        const canMoveDown = index < data.length - 1;
        const isShiftUp = shifting?.upIdx === index;
        const isShiftDown = shifting?.downIdx === index;

        const translateY = shiftAnim.current.interpolate({
          inputRange: [0, 1],
          outputRange: isShiftUp ? [0, -58] : isShiftDown ? [0, 58] : [0, 0],
        });

        return (
          <Animated.View
            key={key}
            style={{ transform: [{ translateY }] }}
            onLayout={(e) => onLayout(index, e)}
          >
            {renderItem(item, index, canMoveUp, canMoveDown)}
          </Animated.View>
        );
      })}
    </View>
  );
}