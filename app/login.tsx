import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react'; // Added useEffect

import {
    ActivityIndicator,
    Alert,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
// 1. Import Animation Tools
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

// 2. Create an Animated version of the Expo Image
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { signInWithGoogle } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [loading, setLoading] = useState(false);

    // 3. Setup Animation Value
    const scale = useSharedValue(1);

    // 4. Start the "Breathing" Zoom Loop
    useEffect(() => {
        scale.value = withRepeat(
            withTiming(1.15, { duration: 10000, easing: Easing.inOut(Easing.ease) }), // Zoom to 1.15x over 10s
            -1,   // Infinite repeat
            true  // Reverse (Zoom back out)
        );
    }, []);

    // 5. Create the Style
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

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
            Alert.alert("Dev Mode", "Google Sign-In requires a Development Build. Please use Email login.");
        }
    };

    return (
        <View style={styles.container}>

            {/* --- 1. HERO SECTION (2/3 Height) --- */}
            <View style={styles.heroSection}>
                {/* 6. Use AnimatedImage with the new style */}
                <AnimatedImage
                    source={require('@/assets/images/empty3.jpg')}
                    style={[styles.heroImage, animatedStyle]}
                    contentFit="cover"
                    transition={1000}
                />
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
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
                        {loading ? (
                            <ActivityIndicator color={colors.text} />
                        ) : (
                            <FontAwesome5 name="google" size={20} color={colors.text} />
                        )}
                        <ThemedText style={styles.socialText}>Continue with Google</ThemedText>
                    </TouchableOpacity>

                    {/* Email Button */}
                    <TouchableOpacity
                        style={[
                            styles.socialButton,
                            {
                                backgroundColor: colors.tint,
                                borderColor: colors.tint,
                                shadowColor: colors.tint,
                                shadowOffset: { width: 0, height: 4 },
                                shadowOpacity: 0.3,
                                shadowRadius: 8,
                                elevation: 4,
                            }
                        ]}
                        onPress={() => router.push('/email-login')}
                    >
                        <IconSymbol name="envelope.fill" size={20} color="#fff" />
                        <ThemedText style={[styles.socialText, { color: '#fff' }]}>Continue with Email</ThemedText>
                    </TouchableOpacity>
                </View>

                {/* Footer Link */}
                <View style={styles.footerRow}>
                    <ThemedText style={styles.footerText}>Don't have an account? </ThemedText>
                    <TouchableOpacity
                        onPress={() => router.push('/email-login?mode=signup')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <ThemedText type="defaultSemiBold" style={{ color: colors.tint }}>Sign Up</ThemedText>
                    </TouchableOpacity>
                </View>

            </ThemedView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    heroSection: {
        height: height * 0.65,
        width: '100%',
        position: 'relative',
        justifyContent: 'flex-end',
        overflow: 'hidden', // <--- 7. IMPORTANT: Keeps the zoomed image inside bounds
    },
    heroImage: { ...StyleSheet.absoluteFillObject },
    heroGradient: { ...StyleSheet.absoluteFillObject, top: '30%' },
    heroContent: {
        padding: 30,
        paddingBottom: 60,
    },
    heroTitle: {
        color: '#fff',
        fontSize: 42,
        lineHeight: 48,
        marginTop: 10,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 18,
        marginTop: 8,
        fontFamily: Fonts.medium,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    bottomSection: {
        flex: 1,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -30,
        paddingHorizontal: 24,
        paddingTop: 40,
        justifyContent: 'space-between',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 10,
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