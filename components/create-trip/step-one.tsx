import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

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

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Where are we going?
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Start by entering your route details.
            </ThemedText>

            {/* Origin Input */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Leaving From
                </ThemedText>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                    placeholder="e.g. Los Angeles, CA"
                    placeholderTextColor="#999"
                    value={form.origin}
                    onChangeText={(text) => setForm({ ...form, origin: text })}
                />
            </View>

            {/* Destination Input */}
            <View style={styles.inputGroup}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    Going To
                </ThemedText>
                <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                    placeholder="e.g. Grand Canyon, AZ"
                    placeholderTextColor="#999"
                    value={form.destination}
                    onChangeText={(text) => setForm({ ...form, destination: text })}
                />
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
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
});