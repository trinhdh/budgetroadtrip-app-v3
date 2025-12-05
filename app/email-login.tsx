import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

export default function EmailLoginScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const { signIn, signUp, sendPasswordReset } = useAuth();

    // Initialize mode based on params (e.g. /email-login?mode=signup)
    const [isSignUp, setIsSignUp] = useState(params.mode === 'signup');

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert("Missing Info", "Please enter both email and password.");
            return;
        }

        if (isSignUp && !displayName.trim()) {
            Alert.alert("Missing Info", "Please enter a display name.");
            return;
        }

        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password, displayName);
                Alert.alert("Success", "Account created! Welcome aboard.");
            } else {
                await signIn(email, password);
            }
            // Navigation is handled by the AuthContext listener in _layout
        } catch (error: any) {
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            if (error.code === 'auth/user-not-found') msg = 'No account found with this email.';
            Alert.alert("Authentication Failed", msg);
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert("Missing Email", "Please enter your email address in the field above.");
            return;
        }
        Alert.alert(
            "Reset Password",
            `Send reset link to ${email}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send",
                    onPress: async () => {
                        try {
                            await sendPasswordReset(email);
                            Alert.alert("Sent", "Check your email for the reset link.");
                        } catch (e: any) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                        <IconSymbol name="xmark" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </ThemedText>
                    <View style={{ width: 40 }} />
                </View>

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'position'}
                    style={{ flex: 1 }}
                >
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollContent}
                    >

                        <View style={styles.formContainer}>

                            {isSignUp && (
                                <View style={styles.inputGroup}>
                                    <ThemedText style={styles.label}>Display Name</ThemedText>
                                    <TextInput
                                        style={[styles.input, {
                                            borderColor: colors.icon + '40',
                                            color: colors.text
                                        }]}
                                        placeholder="John Doe"
                                        placeholderTextColor="#999"
                                        value={displayName}
                                        onChangeText={setDisplayName}
                                        autoCapitalize="words"
                                    />
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Email</ThemedText>
                                <TextInput
                                    style={[styles.input, {
                                        borderColor: colors.icon + '40',
                                        color: colors.text
                                    }]}
                                    placeholder="hello@example.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    importantForAutofill="no"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Password</ThemedText>
                                <TextInput
                                    style={[styles.input, {
                                        borderColor: colors.icon + '40',
                                        color: colors.text
                                    }]}
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    importantForAutofill="no"
                                />
                            </View>

                            {!isSignUp && (
                                <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotLink}>
                                    <ThemedText style={{ color: colors.tint, fontSize: 14 }}>
                                        Forgot Password?
                                    </ThemedText>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: colors.tint }]}
                                onPress={handleEmailAuth}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <ThemedText style={styles.primaryButtonText}>
                                        {isSignUp ? "Sign Up" : "Log In"}
                                    </ThemedText>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity
                                onPress={() => setIsSignUp(!isSignUp)}
                                style={styles.switchRow}
                            >
                                <ThemedText style={{ color: '#808080' }}>
                                    {isSignUp ? "Already have an account? " : "Don't have an account? "}
                                </ThemedText>
                                <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>
                                    {isSignUp ? "Log In" : "Sign Up"}
                                </ThemedText>
                            </TouchableOpacity>

                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        </TouchableWithoutFeedback>
    );

}

const styles = StyleSheet.create({
    container: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    closeButton: {
        padding: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 20,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 100,   // extra room for keyboard & scrolling
        flexGrow: 1,         // ensures scroll works on small screens
    },
    formContainer: {
        gap: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 14,
        color: '#666',
        fontFamily: Fonts.medium,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        backgroundColor: 'transparent',
    },
    forgotLink: {
        alignSelf: 'flex-end',
    },
    primaryButton: {
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 20,
    }
});