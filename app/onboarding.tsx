import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
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
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const SLIDES = [
    {
        id: '1',
        title: 'Plan Your Trip',
        description: 'Create detailed itineraries and manage your budget with ease.',
        image: require('@/assets/images/react-logo.png'), // Ensure these images exist or replace them
    },
    {
        id: '2',
        title: 'Track Expenses',
        description: 'Keep track of every penny spent during your road trip in real-time.',
        image: require('@/assets/images/react-logo.png'),
    },
    {
        id: '3',
        title: 'Enjoy the Ride',
        description: 'Focus on the adventure while we handle the numbers for you.',
        image: require('@/assets/images/react-logo.png'),
    },
];

export default function OnboardingScreen() {
    const router = useRouter();
    const { width } = useWindowDimensions();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);

    // Update index when scroll ends
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
            {/* Header with Skip Button */}
            <View style={styles.header}>
                <TouchableOpacity onPress={completeOnboarding}>
                    <ThemedText style={styles.skipText}>Skip</ThemedText>
                </TouchableOpacity>
            </View>

            {/* Slides */}
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
                        <Image
                            source={item.image}
                            style={styles.image}
                            contentFit="contain"
                        />
                        <View style={styles.textContainer}>
                            <ThemedText type="title" style={styles.title}>{item.title}</ThemedText>
                            <ThemedText style={styles.description}>{item.description}</ThemedText>
                        </View>
                    </View>
                )}
            />

            {/* Footer with Dots and Button */}
            <View style={styles.footer}>
                <View style={styles.pagination}>
                    {SLIDES.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.dot,
                                { backgroundColor: currentIndex === index ? theme.tint : theme.icon },
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
        paddingHorizontal: 20,
    },
    image: {
        width: '80%',
        height: 300,
        marginBottom: 40,
    },
    textContainer: {
        alignItems: 'center',
        gap: 10,
    },
    title: {
        textAlign: 'center',
        fontFamily: Fonts.bold,
    },
    description: {
        textAlign: 'center',
        fontFamily: Fonts.regular,
        color: '#808080',
        paddingHorizontal: 20,
    },
    footer: {
        padding: 20,
        paddingBottom: 50,
        gap: 30,
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
        width: 20,
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
});