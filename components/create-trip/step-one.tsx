import { ThemedText } from '@/components/themed-text';
import { LocationSearchModal } from '@/components/ui/location-search-modal';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
    form: {
        origin: string;
        destination: string;
    };
    setForm: (data: any) => void;
};

export default function StepOne({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    // Track which field is currently searching
    const [activeField, setActiveField] = useState<'origin' | 'destination' | null>(null);

    const handleSelectLocation = (data: any, details: any) => {
        // data.description usually contains "City, State, Country"
        const locationName = data.description;

        if (activeField === 'origin') {
            setForm({ ...form, origin: locationName });
        } else if (activeField === 'destination') {
            setForm({ ...form, destination: locationName });
        }
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Where are we going?
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Start by entering your route details.
            </ThemedText>

            {/* Origin Input (Pressable) */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Leaving From
                </ThemedText>
                <TouchableOpacity
                    style={[styles.input, { borderColor: colors.icon }]}
                    onPress={() => setActiveField('origin')}
                >
                    <ThemedText
                        style={[
                            styles.inputText,
                            !form.origin && { color: '#999' } // Grey out placeholder
                        ]}
                    >
                        {form.origin || 'Search Origin City'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* Destination Input (Pressable) */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Going To
                </ThemedText>
                <TouchableOpacity
                    style={[styles.input, { borderColor: colors.icon }]}
                    onPress={() => setActiveField('destination')}
                >
                    <ThemedText
                        style={[
                            styles.inputText,
                            !form.destination && { color: '#999' }
                        ]}
                    >
                        {form.destination || 'Search Destination City'}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* The Search Modal */}
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
        marginBottom: 20,
    },
    inputGroup: {
        gap: 10,
    },
    label: {
        fontSize: 16,
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        justifyContent: 'center',
        height: 56, // Fixed height to match standard input feel
    },
    inputText: {
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
});