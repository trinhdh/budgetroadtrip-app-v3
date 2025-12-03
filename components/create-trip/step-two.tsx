import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type Props = {
    form: {
        startDate: Date | null;
        duration: number;
        isRoundTrip: boolean | null;
    };
    setForm: (data: any) => void;
};

export default function StepTwo({ form, setForm }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Helper to parse duration safely
    const currentDuration = form.duration || 1;

    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }
        if (selectedDate) {
            setForm({ ...form, startDate: selectedDate });
        }
    };

    const updateDuration = (increment: boolean) => {
        const newValue = increment ? currentDuration + 1 : currentDuration - 1;
        if (newValue < 1) return; // Prevent 0 or negative days
        setForm({ ...form, duration: newValue.toString() });
    };

    const toggleRoundTrip = (value: boolean) => {
        setForm({ ...form, isRoundTrip: value });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Select Date';
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <View style={styles.stepContainer}>
            <ThemedText type="title" style={styles.headline}>
                Trip Details
            </ThemedText>
            <ThemedText style={styles.subheadline}>
                Build your timeline without typing a thing.
            </ThemedText>

            {/* 1. Date Picker Modal Trigger */}
            <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    When do you want to leave?
                </ThemedText>

                <TouchableOpacity
                    style={[styles.inputButton, { borderColor: colors.icon, backgroundColor: colors.background }]}
                    onPress={() => setShowDatePicker(true)}
                >
                    <IconSymbol name="calendar" size={20} color={colors.icon} style={{ marginRight: 10 }} />
                    <ThemedText style={[styles.inputText, !form.startDate && { color: '#999' }]}>
                        {formatDate(form.startDate)}
                    </ThemedText>
                </TouchableOpacity>
            </View>

            {/* 2. Duration Counter */}
            <View style={styles.section}>
                <ThemedText type="defaultSemiBold" style={styles.label}>
                    How many days away?
                </ThemedText>

                <View style={[styles.counterContainer, { borderColor: colors.icon }]}>
                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateDuration(false)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="minus" size={24} color={currentDuration > 1 ? colors.text : '#ccc'} />
                    </TouchableOpacity>

                    <View style={[styles.counterValueContainer, { borderLeftColor: colors.icon, borderRightColor: colors.icon }]}>
                        <ThemedText type="title" style={styles.counterText}>
                            {currentDuration}
                        </ThemedText>
                        <ThemedText style={styles.daysLabel}>Days</ThemedText>
                    </View>

                    <TouchableOpacity
                        style={styles.counterButton}
                        onPress={() => updateDuration(true)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="plus" size={24} color={colors.text} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 3. Round Trip Switch */}
            <View style={[styles.section, styles.switchRow]}>
                <View>
                    <ThemedText type="defaultSemiBold" style={styles.label}>
                        Round Trip?
                    </ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#808080' }}>
                        {form.isRoundTrip ? 'Yes, I return to start.' : 'No, one-way trip.'}
                    </ThemedText>
                </View>

                <Switch
                    trackColor={{ false: '#767577', true: colors.tint }}
                    thumbColor={'#f4f3f4'}
                    ios_backgroundColor="#3e3e3e"
                    onValueChange={toggleRoundTrip}
                    value={form.isRoundTrip ?? false}
                />
            </View>

            {/* 4. The Date Picker Modal (Platform Specific Handling) */}
            {showDatePicker && (
                Platform.OS === 'ios' ? (
                    <Modal
                        transparent={true}
                        animationType="fade"
                        visible={showDatePicker}
                        onRequestClose={() => setShowDatePicker(false)}
                    >
                        <View style={styles.modalOverlay}>
                            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                                <View style={styles.modalHeader}>
                                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                        <ThemedText style={{ color: colors.tint, fontFamily: Fonts.medium }}>Done</ThemedText>
                                    </TouchableOpacity>
                                </View>
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={form.startDate || new Date()}
                                    mode="date"
                                    display="inline"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    accentColor={colors.tint}
                                    textColor={colors.text}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        testID="dateTimePicker"
                        value={form.startDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                    />
                )
            )}
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
    section: {
        gap: 12,
    },
    label: {
        fontSize: 16,
    },
    inputButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    inputText: {
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
    // Counter Styles
    counterContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        height: 56,
        alignItems: 'center',
        overflow: 'hidden',
    },
    counterButton: {
        width: 60,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    counterValueContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'baseline',
        height: '70%', // Visual separator height
        borderLeftWidth: 1,
        borderRightWidth: 1,
        gap: 5,
    },
    counterText: {
        fontSize: 22,
        lineHeight: 28,
    },
    daysLabel: {
        fontSize: 14,
        color: '#808080',
    },
    // Switch Styles
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        borderRadius: 20,
        padding: 20,
        // Shadow for elevation
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        width: '100%',
        alignItems: 'flex-end',
        marginBottom: 10,
    },
});