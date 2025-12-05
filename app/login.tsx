import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { signInWithGoogle } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [loading, setLoading] = useState(false);

    const handleGoogleAuth = async () => {
        if (signInWithGoogle) {
            setLoading(true);
            try {
                await signInWithGoogle();
            } catch (error: any) {
                if (error.code !== '-5') { // User cancelled
                    Alert.alert("Google Sign-In Error", error.message);
                }
            } finally {
                setLoading(false);
            }
        } else {
            Alert.alert("Dev Mode", "Google Sign-In requires a Development Build. Please use Email login.");
        }
    };

    return (
        <View style={styles.container}>

            {/* --- 1. HERO SECTION (2/3 Height) --- */}
            <View style={styles.heroSection}>
                <Image
                    source={require('@/assets/images/empty3.jpg')}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={1000}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.heroGradient}
                />

                <View style={styles.heroContent}>
                    <IconSymbol name="car" size={60} color="#fff" />
                    <ThemedText type="title" style={styles.heroTitle}>Budget RoadTrip</ThemedText>
                    <ThemedText style={styles.heroSubtitle}>Plan smart. Travel far.</ThemedText>
                </View>
            </View>

            {/* --- 2. BOTTOM ACTION SECTION (1/3 Height) --- */}
            <ThemedView style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>

                <View style={styles.buttonGroup}>
                    {/* Google Button */}
                    <TouchableOpacity
                        style={[styles.socialButton, { borderColor: colors.icon + '40' }]}
                        onPress={handleGoogleAuth}
                        disabled={loading}
                    >
                        <IconSymbol name="google" size={20} color={colors.text} />
                        <ThemedText style={styles.socialText}>Continue with Google</ThemedText>
                    </TouchableOpacity>

                    {/* Email Button - Navigates to New Modal */}
                    <TouchableOpacity
                        style={[styles.socialButton, { backgroundColor: '#333', borderColor: '#333' }]}
                        onPress={() => router.push('/email-login')}
                    >
                        <IconSymbol name="envelope.fill" size={20} color="#fff" />
                        <ThemedText style={[styles.socialText, { color: '#fff' }]}>Continue with Email</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Toggle Text - Navigates to New Modal with param */}
                <View style={styles.footerRow}>
                    <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
                    <TouchableOpacity onPress={() => router.push('/email-login?mode=signup')}>
                        <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>Sign Up</ThemedText>
                    </TouchableOpacity>
                </View>

            </ThemedView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    // Hero Section
    heroSection: {
        height: height * 0.65,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
    },
    heroImage: {
        ...StyleSheet.absoluteFillObject,
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
        top: '40%',
    },
    heroContent: {
        padding: 30,
        paddingBottom: 60,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 42,
        lineHeight: 48,
        marginTop: 10,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 18,
        marginTop: 8,
        fontFamily: Fonts.medium,
    },

    // Bottom Section
    bottomSection: {
        flex: 1,
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30, // Overlap the image slightly
        paddingHorizontal: 24,
        paddingTop: 40,
        justifyContent: 'space-between',
    },
    buttonGroup: {
        gap: 16,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    socialText: {
        fontSize: 16,
        fontFamily: Fonts.medium,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: '#808080',
        fontSize: 14,
    },
});