import React, { useCallback, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { clampNormalizedRect, MIN_NORMALIZED_SIZE, type NormalizedRect } from '../../services/imaging/cropMath';

interface CropOverlayProps {
  rect: NormalizedRect;
  onChange: (rect: NormalizedRect) => void;
  displayWidth: number;
  displayHeight: number;
}

type CornerId = 'tl' | 'tr' | 'bl' | 'br';

const HANDLE_HIT = 28;

interface PointerEventLike {
  nativeEvent: { pageX: number; pageY: number };
}

/**
 * Crop selection overlay. Coordinates are normalized [0..1] relative to the
 * displayed image so they map onto pixel space for the manipulator.
 * Drag a corner to resize; drag inside the selection to move it.
 */
export function CropOverlay({ rect, onChange, displayWidth, displayHeight }: CropOverlayProps) {
  const { colors } = useTheme();
  const gesture = useRef<{ startRect: NormalizedRect; startX: number; startY: number; target: CornerId | 'move' } | null>(null);

  const onGrant = useCallback(
    (target: CornerId | 'move') => (event: PointerEventLike) => {
      gesture.current = { startRect: rect, startX: event.nativeEvent.pageX, startY: event.nativeEvent.pageY, target };
    },
    [rect]
  );

  const onMove = useCallback(
    (event: PointerEventLike) => {
      const state = gesture.current;
      if (!state || displayWidth <= 0 || displayHeight <= 0) return;
      const dx = (event.nativeEvent.pageX - state.startX) / displayWidth;
      const dy = (event.nativeEvent.pageY - state.startY) / displayHeight;
      const s = state.startRect;

      let next: NormalizedRect;
      if (state.target === 'move') {
        next = { x: s.x + dx, y: s.y + dy, width: s.width, height: s.height };
      } else {
        let left = s.x;
        let top = s.y;
        let right = s.x + s.width;
        let bottom = s.y + s.height;
        if (state.target === 'tl' || state.target === 'bl') left = Math.min(s.x + dx, right - MIN_NORMALIZED_SIZE);
        if (state.target === 'tr' || state.target === 'br') right = Math.max(s.x + s.width + dx, left + MIN_NORMALIZED_SIZE);
        if (state.target === 'tl' || state.target === 'tr') top = Math.min(s.y + dy, bottom - MIN_NORMALIZED_SIZE);
        if (state.target === 'bl' || state.target === 'br') bottom = Math.max(s.y + s.height + dy, top + MIN_NORMALIZED_SIZE);
        next = { x: left, y: top, width: right - left, height: bottom - top };
      }

      onChange(clampNormalizedRect(next));
    },
    [displayHeight, displayWidth, onChange]
  );

  const onEnd = useCallback(() => {
    gesture.current = null;
  }, []);

  const handlers = (target: CornerId | 'move') => ({
    onStartShouldSetResponder: () => true,
    onResponderGrant: onGrant(target),
    onResponderMove: onMove,
    onResponderRelease: onEnd,
    onResponderTerminate: onEnd,
  });

  const left = rect.x * displayWidth;
  const top = rect.y * displayHeight;
  const width = rect.width * displayWidth;
  const height = rect.height * displayHeight;

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <DimBand style={{ left: 0, right: 0, top: 0, height: Math.max(top, 0) }} color={colors.overlay} />
      <DimBand style={{ left: 0, right: 0, top: top + height, bottom: 0 }} color={colors.overlay} />
      <DimBand style={{ left: 0, width: Math.max(left, 0), top, height }} color={colors.overlay} />
      <DimBand style={{ left: left + width, right: 0, top, height }} color={colors.overlay} />

      <View style={{ position: 'absolute', left, top, width, height, borderColor: colors.accent, borderWidth: 2 }} pointerEvents="none" />

      <View
        {...handlers('move')}
        accessibilityRole="adjustable"
        accessibilityLabel="Crop area. Drag to move."
        style={{
          position: 'absolute',
          left: left + HANDLE_HIT / 2,
          top: top + HANDLE_HIT / 2,
          width: Math.max(width - HANDLE_HIT, 0),
          height: Math.max(height - HANDLE_HIT, 0),
        }}
      />

      <Handle style={{ left: left - HANDLE_HIT / 2, top: top - HANDLE_HIT / 2 }} label="Top-left crop corner" color={colors.accent} handlers={handlers('tl')} />
      <Handle style={{ left: left + width - HANDLE_HIT / 2, top: top - HANDLE_HIT / 2 }} label="Top-right crop corner" color={colors.accent} handlers={handlers('tr')} />
      <Handle style={{ left: left - HANDLE_HIT / 2, top: top + height - HANDLE_HIT / 2 }} label="Bottom-left crop corner" color={colors.accent} handlers={handlers('bl')} />
      <Handle style={{ left: left + width - HANDLE_HIT / 2, top: top + height - HANDLE_HIT / 2 }} label="Bottom-right crop corner" color={colors.accent} handlers={handlers('br')} />
    </View>
  );
}

function DimBand({ style, color }: { style: object; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={[styles.band, { backgroundColor: color }, style as View['props']['style']]}
    />
  );
}

function Handle({
  style,
  label,
  color,
  handlers,
}: {
  style: { left?: number; top?: number };
  label: string;
  color: string;
  handlers: Record<string, unknown>;
}) {
  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      {...handlers}
      style={[styles.handle, { borderColor: color }, style]}
    />
  );
}

const styles = StyleSheet.create({
  band: {
    position: 'absolute',
  },
  handle: {
    borderRadius: 14,
    borderWidth: 3,
    height: HANDLE_HIT,
    position: 'absolute',
    width: HANDLE_HIT,
  },
});
