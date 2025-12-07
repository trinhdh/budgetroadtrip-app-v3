import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Define the Vibe Types
export type TripVibe = 'balanced' | 'comfort' | 'explorer' | 'foodie';

type VibeOption = {
    id: TripVibe;
    label: string;
    icon: string;
    description: string;
};

// Configuration for the options
const VIBE_OPTIONS: VibeOption[] = [
    {
        id: 'balanced',
        label: 'Balanced',
        icon: 'star.fill',
        description: 'Standard mix of hotels, food, and fun.',
    },
    {
        id: 'comfort',
        label: 'Comfort',
        icon: 'bed.double.fill',
        description: 'Prioritizes nice hotels and easy travel.',
    },
    {
        id: 'explorer',
        label: 'Explorer',
        icon: 'map.fill',
        description: 'Focuses on activities and seeing it all.',
    },
    {
        id: 'foodie',
        label: 'Foodie',
        icon: 'fork.knife',
        description: 'Allocates more budget for great dining.',
    },
];

type Props = {
    form: {
        budget: number;
        vibe: TripVibe; // Ensure your parent form state includes this
    };
    setForm: (data: any) => void;
};

export default function StepFive({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    // Default to 'balanced' if not set
    const currentVibe = form.vibe || 'balanced';

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Budget & Vibe
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                How much to spend and what matters most?
            </ThemedText>

            {/* 1. Big Budget Display */}
            <View style={styles.budgetDisplay}>
                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                <ThemedText style={styles.amount}>
                    {form.budget.toLocaleString()}
                </ThemedText>
            </View>

            {/* 2. Budget Slider */}
            <View style={styles.sliderContainer}>
                <View style={styles.sliderLabels}>
                    <ThemedText style={styles.label}>$200</ThemedText>
                    <ThemedText style={styles.label}>$5,000+</ThemedText>
                </View>
                <Slider
                    style={{ width: '100%', height: 40 }}
                    minimumValue={200}
                    maximumValue={5000}
                    step={100}
                    value={form.budget}
                    onValueChange={(value) => setForm({ ...form, budget: value })}
                    minimumTrackTintColor={colors.tint}
                    maximumTrackTintColor={colors.icon + '40'}
                    thumbTintColor={colors.tint}
                />
            </View>

            <View style={styles.divider} />

            {/* 3. Vibe Priority Selector */}
            <View>
                <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
                    Trip Priority
                </ThemedText>

                <View style={styles.vibeGrid}>
                    {VIBE_OPTIONS.map((item) => {
                        const isSelected = currentVibe === item.id;
                        return (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.vibeCard,
                                    isSelected && {
                                        borderColor: colors.tint,
                                        backgroundColor: colors.tint + '10' // 10% opacity
                                    }
                                ]}
                                onPress={() => setForm({ ...form, vibe: item.id })}
                                activeOpacity={0.7}
                            >
                                {/* Card Header */}
                                <View style={styles.cardHeader}>
                                    <IconSymbol
                                        name={item.icon as any}
                                        size={20}
                                        color={isSelected ? colors.tint : '#808080'}
                                    />
                                    <ThemedText style={[
                                        styles.cardTitle,
                                        isSelected && { color: colors.tint, fontFamily: Fonts.bold }
                                    ]}>
                                        {item.label}
                                    </ThemedText>
                                </View>

                                {/* Card Description */}
                                <ThemedText style={styles.cardDesc}>
                                    {item.description}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: { gap: 30 },
    headline: { textAlign: 'center', marginBottom: 5 },
    subheadline: { textAlign: 'center', color: '#808080', marginBottom: 10 },

    // Budget Styles
    budgetDisplay: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', height: 70 },
    currencySymbol: { fontSize: 24, fontFamily: Fonts.bold, marginTop: 8, color: '#808080' },
    amount: { fontSize: 60, fontFamily: Fonts.bold, lineHeight: 70 },

    // Slider Styles
    sliderContainer: { justifyContent: 'center' },
    sliderLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, paddingHorizontal: 10 },
    label: { color: '#808080', fontSize: 13 },

    divider: { height: 1, backgroundColor: '#E0E0E0', opacity: 0.6 },

    // Vibe Grid Styles
    sectionLabel: { fontSize: 16, marginBottom: 12 },
    vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    vibeCard: {
        width: '48%', // Fits two per row with gap
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        minHeight: 100, // Ensures consistent height
        justifyContent: 'flex-start',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    cardTitle: { fontSize: 14, fontFamily: Fonts.medium, color: '#333' },
    cardDesc: { fontSize: 12, color: '#808080', lineHeight: 16 },
});