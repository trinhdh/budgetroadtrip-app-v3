import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type VehicleCategory = {
    id: string;
    label: string;
    avgMpg: string;
};

const CATEGORIES: VehicleCategory[] = [
    { id: 'sedan', label: 'Sedan', avgMpg: '30' },
    { id: 'suv', label: 'SUV', avgMpg: '22' },
    { id: 'truck', label: 'Truck', avgMpg: '18' },
    { id: 'hybrid', label: 'Hybrid', avgMpg: '45' },
];

type Props = {
    selectedMpg: string;
    onSelect: (mpg: string, name: string) => void;
};

export function VehicleSelector({ selectedMpg, onSelect }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    return (
        <View style={styles.container}>
            {CATEGORIES.map((cat) => {
                const isSelected = selectedMpg === cat.avgMpg;
                return (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.card,
                            {
                                borderColor: isSelected ? colors.tint : colors.icon,
                                backgroundColor: isSelected ? colors.tint + '15' : 'transparent', // 15% opacity
                            }
                        ]}
                        onPress={() => onSelect(cat.avgMpg, cat.label)}
                        activeOpacity={0.7}
                    >
                        <ThemedText style={[styles.label, isSelected && { color: colors.tint, fontFamily: Fonts.bold }]}>
                            {cat.label}
                        </ThemedText>
                        <ThemedText style={styles.mpg}>{cat.avgMpg} mpg</ThemedText>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 5,
    },
    card: {
        width: '48%',
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 12, // Compact vertical padding
        paddingHorizontal: 5,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2, // Minimal gap between Title and MPG
    },
    label: {
        fontSize: 16,
        fontFamily: Fonts.medium,
    },
    mpg: {
        fontSize: 13,
        color: '#808080',
    },
});