// This file is a fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolWeight } from 'expo-symbols';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

// Helper to ensure values are valid Material Icons while keeping keys inferred
function createMapping<T extends Record<string, ComponentProps<typeof MaterialIcons>['name']>>(mapping: T) {
  return mapping;
}

/**
 * Add your SF Symbols to Material Icons mappings here.
 */
const MAPPING = createMapping({
  // --- Navigation & Actions ---
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  'chevron.left': 'chevron-left',
  'plus': 'add',
  'minus': 'remove',
  'xmark': 'close',               // ADDED: Close button
  'list.bullet': 'list',
  'line.3.horizontal': 'menu',
  'ellipsis.circle.fill': 'more-horiz',
  'square.and.arrow.up': 'share', // ADDED: Share icon
  'minus.circle.fill': 'remove-circle',
  'checkmark.circle.fill': 'check-circle',

  // --- Objects & Concepts ---
  'calendar': 'calendar-today',
  'car': 'directions-car',
  'speedometer': 'speed',
  'dollarsign': 'attach-money',
  'leaf': 'eco',
  'wand.and.stars': 'auto-awesome',
  'person.2.fill': 'people',
  'person.crop.circle': 'account-circle',
  'pencil': 'edit',
  'bed.double.fill': 'hotel',
  'fork.knife': 'restaurant',
  'mappin.circle.fill': 'pin-drop',
  'map.fill': 'map',             // ADDED: Map toggle
  'clock.fill': 'access-time',
  'star.fill': 'star',
  'camera': 'camera-alt',
  'camera.viewfinder': 'center-focus-weak', // ADDED: Scan icon
  'gear': 'settings',
  'bell.fill': 'notifications',
  'paintbrush.fill': 'palette',
  'envelope.fill': 'mail',
  'doc.text.fill': 'description',
  'doc.text': 'description',      // ADDED: Single doc
  'trash.fill': 'delete',
  'arrow.right.rectangle': 'logout',
  'lock.fill': 'lock',
  'exclamationmark.triangle.fill': 'warning', // ADDED: Warning/Budget alert
  'circle.grid.2x2.fill': 'grid-view',        // ADDED: Category/Other icon
  'scale': 'scale',
});

export type IconSymbolName = keyof typeof MAPPING;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}