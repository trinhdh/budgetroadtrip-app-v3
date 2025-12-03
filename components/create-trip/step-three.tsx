import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    form: {
        adults: number;
        children: number;
    };
    setForm: (data: any) => void;
};

export default function StepThree({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const updateCount = (type: 'adults' | 'children', increment: boolean) => {
        const currentValue = form[type];
        const newValue = increment ? currentValue + 1 : currentValue - 1;

        // Validation: Adults min 1, Children min 0
        if (type === 'adults' && newValue < 1) return;
        if (type === 'children' && newValue < 0) return;

        setForm({ ...form, [type]: newValue });
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Who is coming?
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Add guests to your trip.
            </ThemedText>

            {/* 1. Adults Counter */}
            <View style={styles.inputGroup}>
                <View>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        Adults
                    </ThemedText>
                    <ThemedText style={styles.subLabel}>Age 13 or above</ThemedText>
                </View>

                <View style={[styles.counterContainer, { borderColor: colors.icon }]}>
                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateCount('adults', false)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="minus" size={24} color={form.adults > 1 ? colors.text : '#ccc'} />
                    </TouchableOpacity>

                    <View style={[styles.counterValueContainer, { borderLeftColor: colors.icon, borderRightColor: colors.icon }]}>
                        <ThemedText type="title" style={styles.counterText}>
                            {form.adults}
                        </ThemedText>
                    </View>

                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateCount('adults', true)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="plus" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 2. Children Counter */}
            <View style={styles.inputGroup}>
                <View>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        Children
                    </ThemedText>
                    <ThemedText style={styles.subLabel}>Under 8</ThemedText>
                </View>

                <View style={[styles.counterContainer, { borderColor: colors.icon }]}>
                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateCount('children', false)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="minus" size={24} color={form.children > 0 ? colors.text : '#ccc'} />
                    </TouchableOpacity>

                    <View style={[styles.counterValueContainer, { borderLeftColor: colors.icon, borderRightColor: colors.icon }]}>
                        <ThemedText type="title" style={styles.counterText}>
                            {form.children}
                        </ThemedText>
                    </View>

                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateCount('children', true)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="plus" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: {
        gap: 30,
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
    inputGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    label: {
        fontSize: 18,
    },
    subLabel: {
        fontSize: 14,
        color: '#808080',
        marginTop: 2,
    },
    counterContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        height: 50,
        width: 140, // Fixed width for the counter
        alignItems: 'center',
        overflow: 'hidden',
    },
    counterButton: {
        width: 45,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    counterValueContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        height: '60%',
        borderLeftWidth: 1,
        borderRightWidth: 1,
    },
    counterText: {
        fontSize: 18,
        fontFamily: Fonts.bold,
    },
});