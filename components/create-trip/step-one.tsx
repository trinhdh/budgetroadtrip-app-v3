import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol'; // Ensure this is imported
import { LocationSearchModal } from '@/components/ui/location-search-modal';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
    form: {
        origin: string;
        destination: string;
        originCoordinates?: { latitude: number; longitude: number } | null;
        destinationCoordinates?: { latitude: number; longitude: number } | null;
        mode: 'ai' | 'manual'; // <--- NEW FIELD
    };
    setForm: (data: any) => void;
};

export default function StepOne({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

    const handleSelectLocation = (data: any, details: any) => {
        const locationName = data.description;
        const coords = details?.geometry?.location
            ? {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
            }
            : null;

        if (activeField === 'origin') {
            setForm({
                ...form,
                origin: locationName,
                originCoordinates: coords,
            });
        } else if (activeField === 'destination') {
            setForm({
                ...form,
                destination: locationName,
                destinationCoordinates: coords // <--- CAPTURE THIS
            });
        }
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Trip Details
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Choose how you want to plan your journey.
            </ThemedText>

            {/* PLAN MODE TOGGLE */}
            <View style={styles.modeContainer}>
                <TouchableOpacity
                    style={[styles.modeButton, form.mode === 'ai' && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                    onPress={() => setForm({ ...form, mode: 'ai' })}
                >
                    <IconSymbol name="wand.and.stars" size={24} color={form.mode === 'ai' ? '#fff' : colors.text} />
                    <ThemedText style={[styles.modeText, form.mode === 'ai' && { color: '#fff', fontWeight: 'bold' }]}>AI Planner</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.modeButton, form.mode === 'manual' && { backgroundColor: colors.tint, borderColor: colors.tint }]}
                    onPress={() => setForm({ ...form, mode: 'manual' })}
                >
                    <IconSymbol name="pencil" size={24} color={form.mode === 'manual' ? '#fff' : colors.text} />
                    <ThemedText style={[styles.modeText, form.mode === 'manual' && { color: '#fff', fontWeight: 'bold' }]}>Manual</ThemedText>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* INPUTS */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Leaving From</ThemedText>
                <TouchableOpacity
                    style={[styles.input, { borderColor: colors.icon }]}
                    onPress={() => setActiveField('origin')}
                >
                    <ThemedText style={[styles.inputText, !form.origin && { color: '#999' }]}>
                        {form.origin || 'Search Origin City'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>Going To</ThemedText>
                <TouchableOpacity
                    style={[styles.input, { borderColor: colors.icon }]}
                    onPress={() => setActiveField('destination')}
                >
                    <ThemedText style={[styles.inputText, !form.destination && { color: '#999' }]}>
                        {form.destination || 'Search Destination City'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            <LocationSearchModal
                visible={activeField !== null}
                placeholder={activeField === 'origin' ? "Where are you leaving from?" : "Where are you going?"}
                onClose={() => setActiveField(null)}
                onSelect={handleSelectLocation}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: { gap: 20 },
    headline: { textAlign: 'center', marginBottom: 5 },
    subheadline: { textAlign: 'center', color: '#808080', marginBottom: 10 },
    modeContainer: { flexDirection: 'row', gap: 15, justifyContent: 'center', marginBottom: 10 },
    modeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff' },
    modeText: { fontSize: 16 },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
    inputGroup: { gap: 10 },
    label: { fontSize: 16 },
    input: { borderWidth: 1, borderRadius: 12, padding: 16, justifyContent: 'center', height: 56 },
    inputText: { fontSize: 16, fontFamily: Fonts.regular },
});