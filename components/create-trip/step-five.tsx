import Slider from '@react-native-community/slider';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    form: {
        budget: number;
    };
    setForm: (data: any) => void;
};

export default function StepFive({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Budget
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Set a total budget for your trip.
            </ThemedText>

            {/* 1. Big Budget Display */}
            <View style={styles.budgetDisplay}>
                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                <ThemedText style={styles.amount}>
                    {form.budget.toLocaleString()}
                </ThemedText>
            </View>

            {/* 2. Slider */}
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
                    maximumTrackTintColor={colors.icon}
                    thumbTintColor={colors.tint}
                />
                <ThemedText style={styles.helperText}>
                    This includes gas, hotels, and daily expenses.
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: {
        gap: 40, // Increased gap for cleaner look
    },
    headline: {
        textAlign: 'center',
        marginBottom: 5,
    },
    subheadline: {
        textAlign: 'center',
        color: '#808080',
        marginBottom: 10,
    },
    budgetDisplay: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-start',
        height: 80,
    },
    currencySymbol: {
        fontSize: 24,
        fontFamily: Fonts.bold,
        marginTop: 8,
        color: '#808080',
    },
    amount: {
        fontSize: 64,
        fontFamily: Fonts.bold,
        lineHeight: 70,
    },
    sliderContainer: {
        justifyContent: 'center',
    },
    sliderLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    label: {
        color: '#808080',
        fontSize: 14,
    },
    helperText: {
        textAlign: 'center',
        color: '#808080',
        marginTop: 20,
        fontSize: 14,
    },
});