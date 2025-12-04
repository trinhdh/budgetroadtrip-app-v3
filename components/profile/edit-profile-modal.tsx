import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/firebaseConfig'; // Assuming storage is exported from firebaseConfig
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updateEmail,
    updatePassword,
    updateProfile
} from 'firebase/auth';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
};

// Placeholder URL for default avatar based on email/name (if no photoURL exists)
const defaultAvatarUrl = (email: string | null) =>
    `https://ui-avatars.com/api/?name=${email || 'User'}&background=random`;

export function EditProfileModal({ visible, onClose }: Props) {
    const { user, logout } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    // Profile States
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [newEmail, setNewEmail] = useState('');
    // NEW: Local URI for the image selected from the phone
    const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(null);

    // Security States (used for both email and password change)
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [loading, setLoading] = useState(false);

    // Helper: Check if the user logged in with a traditional email/password (not social)
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
            mediaTypes: ["images"],
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

        // Define storage path: avatars/USER_UID/profile.jpg
        const avatarRef = storageRef(storage, `avatars/${uid}/profile.jpg`);

        await uploadBytes(avatarRef, blob);
        return getDownloadURL(avatarRef);
    };

    // --- LOGIC: Update Display Name and Avatar ---
    const handleUpdateProfile = async () => {
        if (!user || displayName.trim() === '') return;
        setLoading(true);
        let newPhotoURL = user.photoURL;

        try {
            if (localAvatarUri) {
                // 1. Upload the new image to storage
                newPhotoURL = await uploadAvatarToFirebase(localAvatarUri, user.uid);
            }

            // 2. Update Firebase Auth Profile
            await updateProfile(user, {
                displayName: displayName.trim(),
                photoURL: newPhotoURL,
            });

            Alert.alert("Success", "Profile updated successfully!");
            onClose();
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
        // ... (Logic remains unchanged)
        if (!user || !user.email || !currentPassword || !newEmail) {
            Alert.alert("Missing Info", "Please fill in all fields.");
            return;
        }
        setLoading(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updateEmail(user, newEmail);
            Alert.alert("Success", `Email successfully updated to ${newEmail}! You may need to log back in.`);
            onClose();
        } catch (error: any) {
            // ... (Error handling remains unchanged)
            Alert.alert("Error", "Failed to update email address.");
        } finally {
            setLoading(false);
            setCurrentPassword('');
        }
    };

    // --- LOGIC: Change Password ---
    const handleChangePassword = async () => {
        // ... (Logic remains unchanged)
        if (!user || !user.email || !currentPassword || !newPassword || newPassword.length < 6) {
            Alert.alert("Missing Fields", "Please enter current and a new password (min 6 characters).");
            return;
        }
        setLoading(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);
            Alert.alert("Success", "Password changed successfully! You will be logged out now for security.");
            await logout();

        } catch (error: any) {
            // ... (Error handling remains unchanged)
            Alert.alert("Error", "Failed to change password.");
        } finally {
            setLoading(false);
            setCurrentPassword('');
        }
    };

    if (!user) return null;

    // Determine which image to show: local preview or current photo URL
    const displayAvatar = localAvatarUri || user.photoURL || defaultAvatarUrl(user.email);

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.modalBackdrop} />
                </TouchableWithoutFeedback>

                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                    <ThemedView style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText type="subtitle">Edit Profile</ThemedText>
                            <TouchableOpacity onPress={onClose}>
                                <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>

                            {/* --- 1. DISPLAY NAME & AVATAR SECTION --- */}
                            <ThemedText style={styles.sectionTitle}>User Info</ThemedText>

                            {/* Avatar Uploader */}
                            <TouchableOpacity style={styles.avatarUploader} onPress={handleImagePick} disabled={loading}>
                                <Image
                                    source={{ uri: displayAvatar }}
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                                <View style={[styles.cameraIcon, { backgroundColor: colors.tint }]}>
                                    <IconSymbol name="camera" size={20} color="#fff" />
                                </View>
                            </TouchableOpacity>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Display Name</ThemedText>
                                <TextInput
                                    style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                                    value={displayName}
                                    onChangeText={setDisplayName}
                                    placeholder="Traveler"
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                                onPress={handleUpdateProfile}
                                disabled={loading || (displayName === user.displayName && !localAvatarUri)}
                            >
                                {loading && !newPassword ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Save Profile</ThemedText>}
                            </TouchableOpacity>
                            <View style={styles.separator} />


                            {/* --- CONDITIONAL SECTIONS (EMAIL & PASSWORD) --- */}
                            {hasPasswordCredential ? (
                                <>
                                    {/* 2. CHANGE EMAIL SECTION */}
                                    <ThemedText style={styles.sectionTitle}>Change Email</ThemedText>
                                    <ThemedText style={styles.warningText}>
                                        Enter your current password to change your primary login email.
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
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: '#F5A623' }]}
                                        onPress={handleChangeEmail}
                                        disabled={loading || !currentPassword || !newEmail || newEmail === user.email}
                                    >
                                        {loading && newEmail ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Change Email</ThemedText>}
                                    </TouchableOpacity>

                                    <View style={styles.separator} />


                                    {/* 3. CHANGE PASSWORD SECTION */}
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
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: '#FF3B30' }]}
                                        onPress={handleChangePassword}
                                        disabled={loading || !currentPassword || !newPassword || newPassword.length < 6}
                                    >
                                        {loading && newPassword ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Change Password</ThemedText>}
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.socialPasswordMessage}>
                                    <ThemedText type="defaultSemiBold">
                                        Password management is handled by {user.providerData[0].providerId === 'google.com' ? 'Google' : 'your login provider'}.
                                    </ThemedText>
                                    <ThemedText style={{ color: '#808080', marginTop: 8 }}>
                                        To change your password, please visit your account settings on your provider's website.
                                    </ThemedText>
                                </View>
                            )}

                            <View style={{ height: 40 }} />

                        </ScrollView>

                    </ThemedView>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: Platform.OS === 'ios' ? '90%' : '85%',
        width: '100%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
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
        marginHorizontal: -24
    },
    socialPasswordMessage: {
        backgroundColor: '#F2F2F7', // Light grey box for clarity
        padding: 15,
        borderRadius: 12,
        marginTop: 10,
    },
    // Avatar Styles
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
    }
});