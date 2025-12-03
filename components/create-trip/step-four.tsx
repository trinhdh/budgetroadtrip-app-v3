import React, { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { VehicleSelector } from './vehicle-selector';

type Props = {
    form: {
        carName: string;
        mpg: string;
        gasPrice: string;
    };
    setForm: (data: any) => void;
};

export default function StepFour({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    // Smart Default: Set gas price on mount if empty
    useEffect(() => {
        if (!form.gasPrice) {
            setForm({ ...form, gasPrice: '3.20' }); // National Avg
        }
    }, []);

    const handleVehicleSelect = (mpg: string, label: string) => {
        setForm({
            ...form,
            mpg: mpg,
            carName: label // Auto-name it "Sedan" or "SUV"
        });
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Travel Mode
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Select your vehicle to auto-fill estimates.
            </ThemedText>

            {/* 1. Quick Select Grid */}
            <View>
                <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>
                    What are you driving?
                </ThemedText>
                <VehicleSelector
                    selectedMpg={form.mpg}
                    onSelect={handleVehicleSelect}
                />
            </View>

            <View style={styles.divider} />

            {/* 2. Fine Tuning (Auto-filled) */}
            <View style={styles.row}>

                {/* Car Name (Optional) */}
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        Car Name
                    </ThemedText>
                    <View style={[styles.inputContainer, { borderColor: colors.icon }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Sedan"
                            placeholderTextColor="#999"
                            value={form.carName}
                            onChangeText={(text) => setForm({ ...form, carName: text })}
                        />
                    </View>
                </View>

                {/* MPG */}
                <View style={[styles.inputGroup, { width: 100 }]}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        MPG
                    </ThemedText>
                    <View style={[styles.inputContainer, { borderColor: colors.icon }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                            placeholder="0"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={form.mpg}
                            onChangeText={(text) => setForm({ ...form, mpg: text })}
                        />
                    </View>
                </View>
            </View>

            {/* 3. Gas Price */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Gas Price ($)
                </ThemedText>
                <View style={[styles.inputContainer, { borderColor: colors.icon }]}>
                    <IconSymbol name="dollarsign" size={20} color={colors.icon} style={styles.inputIcon} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="3.20"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.gasPrice}
                        onChangeText={(text) => setForm({ ...form, gasPrice: text })}
                    />
                </View>
                <ThemedText style={styles.helperText}>
                    Based on national average. You can edit this.
                </ThemedText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: {
        gap: 20,
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
    sectionLabel: {
        fontSize: 16,
        marginBottom: 5,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#808080',
    },
    row: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        gap: 0,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
    },
    inputIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.regular,
        height: '100%',
    },
    helperText: {
        fontSize: 12,
        color: '#808080',
        marginTop: 6,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 10,
        opacity: 0.5,
    },
});