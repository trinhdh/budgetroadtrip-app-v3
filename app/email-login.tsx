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

    // State for validation errors
    const [errors, setErrors] = useState<{ email?: string; password?: string; displayName?: string }>({});

    // --- HELPER: Email Validation Regex ---
    const isValidEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleEmailAuth = async () => {
        // Reset errors
        const newErrors: typeof errors = {};

        // Validate Email
        if (!email.trim()) {
            newErrors.email = "Email is required.";
        } else if (!isValidEmail(email)) {
            newErrors.email = "Please enter a valid email address.";
        }

        // Validate Password
        if (!password) {
            newErrors.password = "Password is required.";
        } else if (isSignUp && password.length < 6) {
            newErrors.password = "Password must be at least 6 characters.";
        }

        // Validate Display Name (Sign Up only)
        if (isSignUp && !displayName.trim()) {
            newErrors.displayName = "Display Name is required.";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
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
            if (error.code === 'auth/invalid-email') msg = 'The email address is badly formatted.';
            Alert.alert("Authentication Failed", msg);
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        // 1. Clear password field and errors to show it's not needed
        setPassword('');
        setErrors(prev => ({ ...prev, password: undefined }));

        if (!email) {
            setErrors(prev => ({ ...prev, email: "Please enter your email above to reset password." }));
            return;
        }

        if (!isValidEmail(email)) {
            setErrors(prev => ({ ...prev, email: "Please enter a valid email address." }));
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
                            // 2. Updated message to include Spam folder check
                            Alert.alert("Sent", "Check your email (and Spam folder) for the reset link.");
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
                                            borderColor: errors.displayName ? '#ff4444' : colors.icon + '40',
                                            color: colors.text
                                        }]}
                                        placeholder="John Doe"
                                        placeholderTextColor="#999"
                                        value={displayName}
                                        onChangeText={(text) => {
                                            setDisplayName(text);
                                            if (errors.displayName) setErrors(prev => ({ ...prev, displayName: undefined }));
                                        }}
                                        autoCapitalize="words"
                                    />
                                    {errors.displayName && (
                                        <ThemedText style={styles.errorText}>{errors.displayName}</ThemedText>
                                    )}
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Email</ThemedText>
                                <TextInput
                                    style={[styles.input, {
                                        borderColor: errors.email ? '#ff4444' : colors.icon + '40',
                                        color: colors.text
                                    }]}
                                    placeholder="hello@example.com"
                                    placeholderTextColor="#999"
                                    value={email}
                                    onChangeText={(text) => {
                                        setEmail(text);
                                        // Clear error as user types
                                        if (errors.email) setErrors(prev => ({ ...prev, email: undefined }));
                                    }}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    importantForAutofill="no"
                                    keyboardType="email-address"
                                />
                                {errors.email && (
                                    <ThemedText style={styles.errorText}>{errors.email}</ThemedText>
                                )}
                            </View>

                            <View style={styles.inputGroup}>
                                <ThemedText style={styles.label}>Password</ThemedText>
                                <TextInput
                                    style={[styles.input, {
                                        borderColor: errors.password ? '#ff4444' : colors.icon + '40',
                                        color: colors.text
                                    }]}
                                    placeholder="••••••••"
                                    placeholderTextColor="#999"
                                    value={password}
                                    onChangeText={(text) => {
                                        setPassword(text);
                                        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
                                    }}
                                    secureTextEntry
                                    textContentType="oneTimeCode"
                                    autoComplete="off"
                                    importantForAutofill="no"
                                />
                                {errors.password && (
                                    <ThemedText style={styles.errorText}>{errors.password}</ThemedText>
                                )}
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
                                onPress={() => {
                                    setIsSignUp(!isSignUp);
                                    setErrors({}); // Clear errors on mode switch
                                }}
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
        paddingBottom: 100,
        flexGrow: 1,
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
    errorText: {
        color: '#ff4444',
        fontSize: 12,
        marginLeft: 4,
        marginTop: 4,
        fontFamily: Fonts.regular,
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