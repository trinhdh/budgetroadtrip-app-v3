import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EditProfileModal } from '@/components/profile/edit-profile-modal';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
// Assuming these are now exported from your service file (see Note above)
import { cancelAllScheduledNotifications, registerForPushNotificationsAsync } from '@/services/notification';


// --- TYPE DEFINITIONS ---
type SettingItemProps = {
  icon: IconSymbolName;
  color?: string;
  label: string;
  value?: string; // Right side text
  isDestructive?: boolean;
  onPress?: () => void;
  toggleValue?: boolean;
  onToggle?: (val: boolean) => void;
};

// --- REUSABLE ROW COMPONENT ---
function SettingRow({ icon, color, label, value, isDestructive, onPress, toggleValue, onToggle }: SettingItemProps) {
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  return (
    <TouchableOpacity
      style={[styles.row, { backgroundColor: colors.background }]}
      onPress={onPress}
      disabled={!onPress && onToggle === undefined}
      activeOpacity={0.7}
    >
      {/* Icon Box */}
      <View style={[styles.iconBox, { backgroundColor: (color || colors.tint) + '15' }]}>
        <IconSymbol name={icon} size={20} color={color || colors.tint} />
      </View>

      {/* Label */}
      <ThemedText style={[styles.rowLabel, isDestructive && { color: '#FF3B30' }]}>
        {label}
      </ThemedText>

      {/* Right Side Content (Value, Chevron, or Switch) */}
      <View style={styles.rowRight}>
        {value && <ThemedText style={styles.rowValue}>{value}</ThemedText>}

        {onToggle !== undefined ? (
          <Switch
            trackColor={{ false: '#767577', true: colors.tint }}
            thumbColor={'#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            onValueChange={onToggle}
            value={toggleValue}
          />
        ) : (
          <IconSymbol name="chevron.right" size={20} color={colors.icon} />
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const theme = useColorScheme() ?? 'light';
  const colors = Colors[theme];

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  // --- NEW HANDLER ---
  const handleNotificationToggle = async (newValue: boolean) => {
    setNotificationsEnabled(newValue);

    if (newValue) {
      // 1. Request permissions (if needed)
      const granted = await registerForPushNotificationsAsync();

      if (granted) {
        // 2. Schedule reminders if permission is granted
        Alert.alert("Notifications On", "Daily reminders are now scheduled!");
      } else {
        // If permission is denied, revert the toggle and alert user
        setNotificationsEnabled(false);
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your phone's settings to receive alerts."
        );
        Linking.openSettings(); // Direct user to OS settings
      }
    } else {
      // If OFF, cancel all scheduled notifications
      await cancelAllScheduledNotifications();
      Alert.alert("Notifications Off", "All scheduled reminders have been cancelled.");
    }
  };

  // --- ACTIONS ---
  const handleOpenLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      Alert.alert("Error", "Could not open link.");
    }
  };

  const handleEmail = async () => {
    const emailUrl = 'mailto:support@budgetroadtrip.com';
    try {
      const canOpen = await Linking.canOpenURL(emailUrl);
      if (canOpen) {
        await Linking.openURL(emailUrl);
      } else {
        Alert.alert("No Mail App", "Please email us at support@budgetroadtrip.com");
      }
    } catch (e) {
      Alert.alert("Error", "Unable to open email client.");
    }
  };

  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out", style: "destructive", onPress: async () => {
          await logout();
          router.replace('/login');
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert("Delete Account", "This action cannot be undone. All your trips and data will be lost.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => console.log("Delete Account Logic") }
    ]);
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>

        {/* --- HEADER & PROFILE --- */}
        <View style={styles.header}>
          <ThemedText type="title">More</ThemedText>
        </View>

        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
        >
          <Image
            source={{ uri: user?.photoURL || 'https://ui-avatars.com/api/?name=' + (user?.email || 'User') + '&background=random' }}
            style={styles.avatar}
          />
          <View style={styles.profileInfo}>
            <ThemedText type="subtitle" style={styles.userName}>
              {user?.displayName || 'Traveler'}
            </ThemedText>
            <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>
          </View>
          {/* --- EDIT BUTTON: Opens Modal --- */}
          <TouchableOpacity style={styles.editBtn} onPress={() => setIsEditModalVisible(true)}>
            <ThemedText style={{ color: colors.tint, fontFamily: Fonts.medium }}>Edit</ThemedText>
          </TouchableOpacity>
        </TouchableOpacity>

        {/* --- SETTINGS GROUP --- */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Settings</ThemedText>
          <View style={styles.sectionBody}>
            <SettingRow
              icon="bell.fill"
              label="Notifications"
              toggleValue={notificationsEnabled}
              onToggle={handleNotificationToggle} // <--- UPDATED HANDLER
            />
            <View style={styles.separator} />
            <SettingRow
              icon="paintbrush.fill"
              label="Appearance"
              value="System"
              onPress={() => Linking.openSettings()}
            />
          </View>
        </View>

        {/* --- SUPPORT GROUP --- */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Support</ThemedText>
          <View style={styles.sectionBody}>
            <SettingRow
              icon="envelope.fill"
              label="Give us Feedback"
              onPress={handleEmail}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="star.fill"
              label="Rate the App"
              color="#FFD700"
              onPress={() => console.log("Open Store Review")}
            />
          </View>
        </View>

        {/* --- LEGAL GROUP --- */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Legal</ThemedText>
          <View style={styles.sectionBody}>
            <SettingRow
              icon="doc.text.fill"
              label="Terms of Service"
              onPress={() => handleOpenLink('https://google.com')}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="lock.fill"
              label="Privacy Policy"
              onPress={() => handleOpenLink('https://google.com')}
            />
          </View>
        </View>

        {/* --- DANGER ZONE --- */}
        <View style={styles.section}>
          <View style={[styles.sectionBody, { marginTop: 10 }]}>
            <SettingRow
              icon="arrow.right.rectangle"
              label="Log Out"
              color={colors.text}
              onPress={handleLogout}
            />
            <View style={styles.separator} />
            <SettingRow
              icon="trash.fill"
              label="Delete Account"
              isDestructive
              color="#FF3B30"
              onPress={handleDeleteAccount}
            />
          </View>
        </View>

        <ThemedText style={styles.versionText}>Version 1.0.0 (Build 45)</ThemedText>
        <View style={{ height: 40 }} />

      </ScrollView>

      {/* --- RENDER EDIT PROFILE MODAL --- */}
      <EditProfileModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
      />

    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 50,
  },
  header: {
    marginTop: 10,
    marginBottom: 20,
  },
  // Profile Card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 30,
    borderWidth: 1,
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontSize: 18,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#808080',
    fontFamily: Fonts.regular,
  },
  editBtn: {
    padding: 8,
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#808080',
    fontFamily: Fonts.medium,
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  sectionBody: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 16,
    color: '#808080',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 60, // Indent separator to align with text
  },
  versionText: {
    textAlign: 'center',
    color: '#CCC',
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 10,
  },
});