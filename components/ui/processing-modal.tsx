import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    visible: boolean;
};

const LOADING_MESSAGES = [
    "Connecting to AI Planner...",
    "Calculating fuel costs...",
    "Searching for cheapest routes...",
    "Finding budget-friendly hotels...",
    "Finalizing your itinerary...",
];

export function ProcessingModal({ visible }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const [messageIndex, setMessageIndex] = useState(0);

    // Animation Value
    const scale = useSharedValue(1);

    // 1. Text Cycle Logic
    useEffect(() => {
        if (!visible) return;

        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        }, 1200); // Change text every 1.2 seconds

        return () => clearInterval(interval);
    }, [visible]);

    // 2. Pulse Animation Logic
    useEffect(() => {
        if (visible) {
            scale.value = withRepeat(
                withSequence(
                    withTiming(1.2, { duration: 800 }), // Scale up
                    withTiming(1, { duration: 800 })   // Scale down
                ),
                -1, // Infinite repeat
                true // Reverse
            );
        }
    }, [visible]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={[styles.card, { backgroundColor: colors.background }]}>

                    {/* Animated Icon */}
                    <Animated.View style={[styles.iconContainer, animatedStyle]}>
                        <IconSymbol name="wand.and.stars" size={60} color={colors.tint} />
                    </Animated.View>

                    {/* Title */}
                    <ThemedText type="subtitle" style={styles.title}>
                        Planning your trip...
                    </ThemedText>

                    {/* Cycling Message */}
                    <ThemedText style={styles.message}>
                        {LOADING_MESSAGES[messageIndex]}
                    </ThemedText>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)', // Semi-transparent black
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        width: '80%',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    iconContainer: {
        marginBottom: 20,
    },
    title: {
        marginBottom: 10,
        fontFamily: Fonts.bold,
    },
    message: {
        textAlign: 'center',
        color: '#808080',
        fontSize: 16,
        height: 24, // Fixed height to prevent jumping when text changes
    },
});