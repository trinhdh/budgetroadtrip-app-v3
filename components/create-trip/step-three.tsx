import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

type Props = {
    form: { adults: number; children: number };
    setForm: (data: any) => void;
};

export default function StepThree({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const updateCount = (field: 'adults' | 'children', amount: number) => {
        const current = form[field];
        const min = field === 'adults' ? 1 : 0;
        const newVal = Math.max(min, current + amount);
        setForm({ ...form, [field]: newVal });
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>Who is coming?</ThemedText>

            <View style={styles.row}>
                <View>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Adults</ThemedText>
                    <ThemedText style={{ color: '#808080' }}>Age 13+</ThemedText>
                </View>
                <View style={styles.counter}>
                    <TouchableOpacity onPress={() => updateCount('adults', -1)} style={[styles.btn, { backgroundColor: colors.background }]}>
                        <IconSymbol name="minus" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText style={styles.countText}>{form.adults}</ThemedText>
                    <TouchableOpacity onPress={() => updateCount('adults', 1)} style={[styles.btn, { backgroundColor: colors.tint }]}>
                        <IconSymbol name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View>
                    <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Children</ThemedText>
                    <ThemedText style={{ color: '#808080' }}>Age 0-12</ThemedText>
                </View>
                <View style={styles.counter}>
                    <TouchableOpacity onPress={() => updateCount('children', -1)} style={[styles.btn, { backgroundColor: colors.background }]}>
                        <IconSymbol name="minus" size={24} color={colors.text} />
                    </TouchableOpacity>
                    <ThemedText style={styles.countText}>{form.children}</ThemedText>
                    <TouchableOpacity onPress={() => updateCount('children', 1)} style={[styles.btn, { backgroundColor: colors.tint }]}>
                        <IconSymbol name="plus" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    stepContainer: { gap: 24 },
    headline: { textAlign: 'center', marginBottom: 20 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    divider: { height: 1, backgroundColor: '#eee' },
    counter: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    btn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
    countText: { fontSize: 20, fontWeight: 'bold', width: 20, textAlign: 'center' }
});