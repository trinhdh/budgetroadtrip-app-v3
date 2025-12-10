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
  'xmark': 'close',
  'list.bullet': 'list',
  'line.3.horizontal': 'menu',
  'ellipsis.circle.fill': 'more-horiz',
  'square.and.arrow.up': 'share',
  'minus.circle.fill': 'remove-circle',
  'checkmark.circle.fill': 'check-circle',

  // --- MISSING ICONS ADDED HERE ---
  'play.fill': 'play-arrow',        // For the "Start" marker
  'banknote': 'attach-money',       // For Expenses
  'banknote.fill': 'attach-money',  // Alternative Expense icon
  'fuelpump.fill': 'local-gas-station', // For Fuel stops

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
  'map.fill': 'map',
  'clock.fill': 'access-time',
  'star.fill': 'star',
  'camera': 'camera-alt',
  'camera.fill': 'photo-camera',    // Added: For Activities
  'camera.viewfinder': 'center-focus-weak',
  'gear': 'settings',
  'bell.fill': 'notifications',
  'paintbrush.fill': 'palette',
  'envelope.fill': 'mail',
  'doc.text.fill': 'description',
  'doc.text': 'description',
  'trash.fill': 'delete',
  'arrow.right.rectangle': 'logout',
  'lock.fill': 'lock',
  'exclamationmark.triangle.fill': 'warning',
  'circle.grid.2x2.fill': 'grid-view',
  'mappin.and.ellipse': 'add-location',

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