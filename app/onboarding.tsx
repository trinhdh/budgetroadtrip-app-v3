import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    FlatList,
    StyleSheet,
    TouchableOpacity,
    useWindowDimensions,
    View,
    ViewToken,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol, IconSymbolName } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// 1. Update Type to support an optional second icon
type Slide = {
    id: string;
    title: string;
    description: string;
    icon: IconSymbolName;
    secondaryIcon?: IconSymbolName; // <--- NEW OPTIONAL FIELD
};

const SLIDES: Slide[] = [
    {
        id: '1',
        title: 'AI-Powered Itineraries',
        description: 'Tell us where and how much. Our AI builds a complete day-by-day plan with hotels, food, and activities in seconds.',
        icon: 'wand.and.stars',
        secondaryIcon: 'map.fill', // <--- ADDED MAP ICON HERE
    },
    {
        id: '2',
        title: 'Smart Expense Tracking',
        description: 'Never lose a receipt again. Scan them instantly, categorize spending, and stay exactly on budget.',
        icon: 'doc.text.fill',
    },
    {
        id: '3',
        title: 'Split Costs Easily',
        description: 'Traveling with friends? Track who paid for what and settle debts with a single tap. No more awkward math.',
        icon: 'person.2.fill',
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme();
    // Default to light scheme colors if undefined
    const theme = Colors[colorScheme ?? 'light'];

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrentIndex(viewableItems[0].index);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            completeOnboarding();
        }
    };

    const completeOnboarding = async () => {
        try {
            await AsyncStorage.setItem('hasOnboarded', 'true');
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Error saving onboarding status:', error);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={completeOnboarding}>
                    <ThemedText style={styles.skipText}>Skip</ThemedText>
                </TouchableOpacity>
            </View>

            <FlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                bounces={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewConfig}
                renderItem={({ item }) => (
                    <View style={[styles.slide, { width }]}>

                        {/* --- ICON HERO SECTION --- */}
                        <View style={[styles.iconContainer, { backgroundColor: theme.tint + '15' }]}>
                            {/* Main Icon */}
                            <IconSymbol
                                name={item.icon}
                                size={80}
                                color={theme.tint}
                            />

                            {/* 2. Render Secondary Icon (Floating Badge) if it exists */}
                            {item.secondaryIcon && (
                                <View style={[styles.secondaryBadge, { backgroundColor: theme.background, borderColor: theme.tint + '20' }]}>
                                    <IconSymbol
                                        name={item.secondaryIcon}
                                        size={28}
                                        color={theme.tint}
                                    />
                                </View>
                            )}
                        </View>

                        <View style={styles.textContainer}>
                            <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
                            <ThemedText style={styles.description}>{item.description}</ThemedText>
                        </View>
                    </View>
                )}
            />

            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: currentIndex === index ? theme.tint : theme.icon + '40' },
                                currentIndex === index && styles.activeDot,
                            ]}
                        />
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.tint }]}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <ThemedText style={styles.buttonText}>
                        {currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        alignItems: 'flex-end',
    },
    skipText: {
        fontFamily: Fonts.medium,
        fontSize: 16,
        color: '#808080',
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    iconContainer: {
        width: 180,
        height: 180,
        borderRadius: 90,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 50,
        position: 'relative', // Needed for absolute positioning of secondary icon
    },
    // 3. New Style for the floating map icon
    secondaryBadge: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    textContainer: {
        alignItems: 'center',
        gap: 16,
    },
    title: {
        textAlign: 'center',
        fontFamily: Fonts.bold,
        fontSize: 28,
    },
    description: {
        textAlign: 'center',
        fontFamily: Fonts.regular,
        color: '#808080',
        fontSize: 16,
        lineHeight: 24,
    },
    footer: {
        padding: 20,
        paddingBottom: 60,
        gap: 40,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        width: 24,
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
});