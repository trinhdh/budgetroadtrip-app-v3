import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
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

    const handleVehicleSelect = (mpg: string, label: string) => {
        setForm({
            ...form,
            mpg: mpg,
            carName: label
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
            <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    What are you driving?
                </ThemedText>
                <VehicleSelector
                    selectedMpg={form.mpg}
                    onSelect={handleVehicleSelect}
                />
            </View>

            <View style={styles.divider} />

            {/* 2. Car Details Row */}
            <View style={styles.row}>
                {/* Car Name */}
                <View style={{ flex: 1, gap: 8 }}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        Car Name
                    </ThemedText>
                    <View style={[styles.inputContainer, { borderColor: colors.icon, backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="e.g. Sedan"
                            placeholderTextColor="#999"
                            value={form.carName}
                            onChangeText={(text) => setForm({ ...form, carName: text })}
                        />
                    </View>
                </View>

                {/* MPG */}
                <View style={{ width: 100, gap: 8 }}>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        MPG
                    </ThemedText>
                    <View style={[styles.inputContainer, { borderColor: colors.icon, backgroundColor: colors.background }]}>
                        <TextInput
                            style={[styles.input, { color: colors.text, textAlign: 'center' }]}
                            placeholder="25"
                            placeholderTextColor="#999"
                            keyboardType="numeric"
                            value={form.mpg}
                            onChangeText={(text) => setForm({ ...form, mpg: text })}
                        />
                    </View>
                </View>
            </View>

            {/* 3. Gas Price */}
            <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Gas Price ($/gal)
                </ThemedText>

                <View style={[styles.inputContainer, { borderColor: colors.icon, backgroundColor: colors.background }]}>
                    <IconSymbol name="dollarsign" size={20} color={colors.icon} style={{ marginRight: 12 }} />
                    <TextInput
                        style={[styles.input, { color: colors.text }]}
                        placeholder="2.90"
                        placeholderTextColor="#999"
                        keyboardType="decimal-pad"
                        value={form.gasPrice}
                        onChangeText={(text) => setForm({ ...form, gasPrice: text })}
                    />
                </View>

                {/* Helper + External Link */}
                <View style={styles.helperContainer}>
                    <ThemedText style={styles.helperText}>Based on national avg.</ThemedText>
                    <ExternalLink href="https://gasprices.aaa.com/">
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ThemedText style={[styles.linkText, { color: colors.tint }]}>
                                Check AAA Prices
                            </ThemedText>
                            <IconSymbol name="arrow.up.right" size={12} color={colors.tint} style={{ marginLeft: 2 }} />
                        </View>
                    </ExternalLink>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: { gap: 24 },
    headline: { textAlign: 'center', marginBottom: 5 },
    subheadline: { textAlign: 'center', color: '#808080', marginBottom: 10 },

    section: { gap: 8 },
    label: { fontSize: 16 },

    // Consistent Input Styles (Height 56 matches Step 1 & 2)
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.regular,
        height: '100%'
    },

    row: { flexDirection: 'row', gap: 12 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },

    helperContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 4
    },
    helperText: { fontSize: 12, color: '#808080' },
    linkText: { fontSize: 12, fontWeight: '600' }
});