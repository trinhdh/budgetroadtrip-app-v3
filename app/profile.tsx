// app/profile.tsx
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { auth, storage } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripService } from '@/services/trip-service';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRouter } from 'expo-router';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail,
    updatePassword,
    updateProfile
} from 'firebase/auth';

import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

const defaultAvatarUrl = (email: string | null) =>
    `https://ui-avatars.com/api/?name=${email || 'User'}&background=random`;

export default function ProfileScreen() {
    const { user, logout, refreshUser } = useAuth();
    const router = useRouter();
    const navigation = useNavigation();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    // --- 1. SETUP HEADER BUTTONS ---
    useEffect(() => {
        navigation.setOptions({
            headerTitle: 'Edit Profile',
            headerLeft: () => (
                <TouchableOpacity onPress={() => router.back()}>
                    <ThemedText style={{ color: colors.tint, fontSize: 17 }}>Cancel</ThemedText>
                </TouchableOpacity>
            ),
        });
    }, [navigation, colors.tint]);

    // Profile States
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [newEmail, setNewEmail] = useState('');
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

    // Security States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const hasPasswordCredential = user?.providerData.some(
        (p) => p.providerId === 'password'
    );

    // --- LOGIC: Image Picker ---
    const handleImagePick = async () => {
        if (Platform.OS !== 'web') {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'We need camera roll permissions to select an avatar.');
                return;
            }
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setLocalAvatarUri(result.assets[0].uri);
        }
    };

    // --- LOGIC: Upload to Firebase Storage ---
    const uploadAvatarToFirebase = async (uri: string, uid: string) => {
        const response = await fetch(uri);
        const blob = await response.blob();
        const avatarRef = storageRef(storage, `avatars/${uid}/profile.jpg`);
        await uploadBytes(avatarRef, blob);
        return getDownloadURL(avatarRef);
    };

    // --- LOGIC: Update Display Name and Avatar ---
    // --- LOGIC: Update Display Name and Avatar ---
    const handleUpdateProfile = async () => {
        // 1. CRITICAL FIX: Get the SDK user object directly.
        // The 'user' from Context might be a plain object (missing methods), 
        // but 'auth.currentUser' is always the real class instance.
        const currentUser = auth.currentUser;

        if (!currentUser || displayName.trim() === '') return;

        setLoading(true);
        let newPhotoURL = currentUser.photoURL;

        try {
            // 2. Upload new image if selected
            if (localAvatarUri) {
                newPhotoURL = await uploadAvatarToFirebase(localAvatarUri, currentUser.uid);
            }

            // 3. Update Firebase Auth (Cloud)
            // valid because we are using 'currentUser' which has the method
            await updateProfile(currentUser, {
                displayName: displayName.trim(),
                photoURL: newPhotoURL,
            });

            // 4. Update Context (Local App State)
            // This makes the new name/image appear instantly in your app
            await refreshUser();

            // 5. Sync to Database (Trips & Expenses)
            // This updates your historical data in Firestore
            await TripService.syncUserProfile(
                currentUser.uid,
                displayName.trim(),
                newPhotoURL
            );

            Alert.alert("Success", "Profile updated successfully!");
            router.back();
        } catch (error) {
            console.error("Profile update failed:", error);
            Alert.alert("Error", "Failed to update profile or upload avatar.");
        } finally {
            setLoading(false);
            setLocalAvatarUri(null);
        }
    };

    // --- LOGIC: Change Email ---
    const handleChangeEmail = async () => {
        if (!user || !user.email || !currentPassword || !newEmail) {
            Alert.alert("Missing Info", "Please fill in all fields.");
            return;
        }
        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updateEmail(user, newEmail);
            Alert.alert("Success", `Email updated to ${newEmail}!`);
            router.back();
        } catch (error: any) {
            Alert.alert("Error", "Failed to update email address.");
        } finally {
            setLoading(false);
            setCurrentPassword('');
        }
    };

    // --- LOGIC: Change Password ---
    const handleChangePassword = async () => {
        if (!user || !user.email || !currentPassword || !newPassword || newPassword.length < 6) {
            Alert.alert("Missing Fields", "Please enter current and a new password (min 6 chars).");
            return;
        }
        setLoading(true);
        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            Alert.alert("Success", "Password changed! You will be logged out.");
            await logout();
            router.replace('/login');
        } catch (error: any) {
            Alert.alert("Error", "Failed to change password.");
        } finally {
            setLoading(false);
            setCurrentPassword('');
        }
    };

    if (!user) return null;

    const displayAvatar = localAvatarUri || user.photoURL || defaultAvatarUrl(user.email);

    return (
        <ThemedView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={100}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                >
                    {/* --- 1. DISPLAY NAME & AVATAR SECTION --- */}
                    <ThemedText style={styles.sectionTitle}>User Info</ThemedText>

                    <TouchableOpacity style={styles.avatarUploader} onPress={handleImagePick} disabled={loading}>
                        <Image
                            source={{ uri: displayAvatar }}
                            style={styles.avatar}
                            contentFit="cover"
                        />
                        <View style={[styles.cameraIcon, { backgroundColor: colors.tint }]}>
                            <IconSymbol name="camera.fill" size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>

                    <View style={styles.inputGroup}>
                        <ThemedText style={styles.label}>Display Name</ThemedText>
                        <TextInput
                            style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                            value={displayName}
                            onChangeText={setDisplayName}
                            placeholder="Traveler"
                            placeholderTextColor="#999"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: colors.tint }]}
                        onPress={handleUpdateProfile}
                        disabled={loading || (displayName === user.displayName && !localAvatarUri)}
                    >
                        {loading && !newPassword ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.buttonText}>Save Profile</ThemedText>
                        )}
                    </TouchableOpacity>

                    <View style={styles.separator} />

                    {/* --- CONDITIONAL SECTIONS --- */}
                    {hasPasswordCredential ? (
                        <>
                            {/* 2. CHANGE EMAIL */}
                            <ThemedText style={styles.sectionTitle}>Change Email</ThemedText>
                            <ThemedText style={styles.warningText}>
                                Enter your current password to change your login email.
                            </ThemedText>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>New Email Address</ThemedText>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                                    value={newEmail}
                                    onChangeText={setNewEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholder="new@example.com"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Confirm Current Password</ThemedText>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: '#F5A623' }]}
                                onPress={handleChangeEmail}
                                disabled={loading || !currentPassword || !newEmail || newEmail === user.email}
                            >
                                {loading && newEmail ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.buttonText}>Change Email</ThemedText>
                                )}
                            </TouchableOpacity>

                            <View style={styles.separator} />

                            {/* 3. CHANGE PASSWORD */}
                            <ThemedText style={styles.sectionTitle}>Change Password</ThemedText>
                            <ThemedText style={styles.warningText}>
                                Re-enter your current password and set a new one.
                            </ThemedText>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Current Password</ThemedText>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>New Password</ThemedText>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry
                                    placeholder="•••••••• (Min 6 characters)"
                                    placeholderTextColor="#999"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: '#FF3B30' }]}
                                onPress={handleChangePassword}
                                disabled={loading || !currentPassword || !newPassword || newPassword.length < 6}
                            >
                                {loading && newPassword ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.buttonText}>Change Password</ThemedText>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.socialPasswordMessage}>
                            <ThemedText type="defaultSemiBold" style={{ color: '#333' }}>
                                Password management is handled by {user.providerData[0].providerId === 'google.com' ? 'Google' : 'your login provider'}.
                            </ThemedText>
                            <ThemedText style={{ color: '#666', marginTop: 8 }}>
                                To change your password, please visit your account settings on your provider's website.
                            </ThemedText>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    sectionTitle: { fontSize: 18, fontFamily: Fonts.bold, marginTop: 10, marginBottom: 15 },
    warningText: { color: '#808080', marginBottom: 15, fontSize: 13, paddingHorizontal: 5 },
    inputGroup: { marginBottom: 15 },
    label: { fontSize: 14, fontFamily: Fonts.medium, marginBottom: 5, color: '#666' },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: Fonts.regular
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
    separator: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 30,
    },
    socialPasswordMessage: {
        backgroundColor: '#F2F2F7',
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
    },
    avatarUploader: {
        alignSelf: 'center',
        marginBottom: 25,
        position: 'relative',
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E0E0E0',
        borderWidth: 2,
        borderColor: '#fff',
    },
    cameraIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        padding: 8,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#fff',
        overflow: 'hidden'
    }
});