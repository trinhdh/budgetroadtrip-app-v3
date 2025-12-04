import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    // Destructure sendPasswordReset
    const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleEmailAuth = async () => {
        if (!email || !password) {
            Alert.alert("Error", "Please enter both email and password.");
            return;
        }
        setLoading(true);
        try {
            if (isSignUp) {
                await signUp(email, password);
                Alert.alert("Success", "Account created!");
            } else {
                await signIn(email, password);
            }
        } catch (error: any) {
            let msg = error.message;
            if (error.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
            if (error.code === 'auth/email-already-in-use') msg = 'Email already in use.';
            Alert.alert("Authentication Failed", msg);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleAuth = async () => {
        if (signInWithGoogle) {
            setLoading(true);
            try {
                await signInWithGoogle();
            } catch (error: any) {
                if (error.code !== '-5') {
                    Alert.alert("Google Sign-In Error", error.message);
                }
            } finally {
                setLoading(false);
            }
        } else {
            Alert.alert("Not Supported", "Google Sign-In requires a Development Build. It does not work in Expo Go.");
        }
    };

    // --- NEW HANDLER ---
    const handleForgotPassword = async () => {
        if (!email) {
            Alert.alert("Missing Email", "Please enter your email address above to reset your password.");
            return;
        }

        Alert.alert(
            "Reset Password",
            `A password reset link will be sent to ${email}. Continue?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Send Link",
                    onPress: async () => {
                        setLoading(true);
                        try {
                            await sendPasswordReset(email);
                            Alert.alert("Success", "Password reset email sent! Check your inbox.");
                        } catch (error: any) {
                            let msg = "Failed to send reset link. Please check the email address.";
                            if (error.code === 'auth/user-not-found') {
                                msg = "No account found with that email address.";
                            }
                            Alert.alert("Error", msg);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };


    return (
        <ThemedView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>

                <View style={styles.header}>
                    <IconSymbol name="car" size={60} color={colors.tint} />
                    <ThemedText type="title" style={styles.title}>
                        {isSignUp ? "Create Account" : "Welcome Back"}
                    </ThemedText>
                    <ThemedText style={styles.subtitle}>
                        {isSignUp ? "Sign up to start planning trips" : "Log in to continue your adventure"}
                    </ThemedText>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputContainer}>
                        <ThemedText style={styles.label}>Email</ThemedText>
                        <TextInput
                            style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                            placeholder="hello@example.com"
                            placeholderTextColor="#999"
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <ThemedText style={styles.label}>Password</ThemedText>
                        <TextInput
                            style={[styles.input, { borderColor: colors.icon, color: colors.text }]}
                            placeholder="••••••••"
                            placeholderTextColor="#999"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    {/* --- FORGOT PASSWORD LINK --- */}
                    {!isSignUp && (
                        <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPasswordLink}>
                            <ThemedText style={{ color: '#808080', fontSize: 14 }}>
                                Forgot Password?
                            </ThemedText>
                        </TouchableOpacity>
                    )}


                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.tint }]}
                        onPress={handleEmailAuth}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <ThemedText style={styles.buttonText}>
                                {isSignUp ? "Sign Up" : "Log In"}
                            </ThemedText>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.switchButton}>
                        <ThemedText style={{ color: colors.tint }}>
                            {isSignUp ? "Already have an account? Log In" : "Don't have an account? Sign Up"}
                        </ThemedText>
                    </TouchableOpacity>
                </View>

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <ThemedText style={styles.orText}>OR</ThemedText>
                    <View style={styles.line} />
                </View>

                <View style={styles.socialContainer}>
                    <TouchableOpacity
                        style={[styles.socialButton, { borderColor: colors.icon }]}
                        onPress={handleGoogleAuth}
                        disabled={loading}
                    >
                        {/* <IconSymbol name="globe" size={20} color={colors.text} /> */}
                        <ThemedText style={styles.socialText}>Continue with Google</ThemedText>
                    </TouchableOpacity>
                </View>

            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 24, justifyContent: 'center' },
    keyboardView: { flex: 1, justifyContent: 'center' },
    header: { alignItems: 'center', marginBottom: 40 },
    title: { marginTop: 20, marginBottom: 8 },
    subtitle: { color: '#808080', textAlign: 'center' },
    form: { gap: 16 },
    inputContainer: { gap: 8 },
    label: { fontSize: 14, fontFamily: Fonts.medium },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
    button: { height: 56, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    buttonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
    switchButton: { alignItems: 'center', marginTop: 12 },
    divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 30 },
    line: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
    orText: { marginHorizontal: 16, color: '#808080', fontSize: 12 },
    socialContainer: { gap: 12 },
    socialButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 50, borderRadius: 12, borderWidth: 1, gap: 10
    },
    socialText: { fontSize: 16, fontFamily: Fonts.medium },
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginTop: -10, // Pull it up closer to the password field
        marginBottom: 10,
    }
});