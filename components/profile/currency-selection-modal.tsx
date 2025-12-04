import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import React from 'react';
import { Dimensions, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';

const { height } = Dimensions.get('window');

type Currency = { label: string, symbol: string, value: string };

const CURRENCY_OPTIONS: Currency[] = [
    { label: 'US Dollar', symbol: '$', value: 'USD ($)' },
    { label: 'Euro', symbol: '€', value: 'EUR (€)' },
    { label: 'Canadian Dollar', symbol: 'C$', value: 'CAD (C$)' },
    { label: 'Pound Sterling', symbol: '£', value: 'GBP (£)' },
    { label: 'Australian Dollar', symbol: 'A$', value: 'AUD (A$)' },
];

type Props = {
    visible: boolean;
    currentCurrency: string;
    onClose: () => void;
    onSelect: (currency: string) => void;
};

export function CurrencySelectionModal({ visible, currentCurrency, onClose, onSelect }: Props) {
    // Use a neutral theme for the modal overlay/backdrop
    const theme = 'light';
    const colors = Colors[theme];
    const tintColor = Colors.light.tint;

    const handleSelect = (currencyValue: string) => {
        onSelect(currencyValue);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} />

                <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                    <ThemedText type="subtitle" style={styles.headerTitle}>Select Currency</ThemedText>

                    {CURRENCY_OPTIONS.map(option => {
                        const isSelected = currentCurrency === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.row, isSelected && { backgroundColor: tintColor + '10' }]} // Highlight selected row
                                onPress={() => handleSelect(option.value)}
                                activeOpacity={0.8}
                            >
                                <ThemedText
                                    style={[
                                        styles.rowLabel,
                                        isSelected && { color: tintColor, fontFamily: Fonts.bold }
                                    ]}
                                >
                                    {option.label}
                                </ThemedText>
                                <ThemedText style={[styles.rowValue, isSelected && { color: tintColor, fontFamily: Fonts.bold }]}>
                                    {option.value}
                                </ThemedText>
                                {isSelected && <IconSymbol name="checkmark.circle.fill" size={20} color={tintColor} />}
                            </TouchableOpacity>
                        );
                    })}
                    <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                        <ThemedText style={styles.cancelText}>Cancel</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContent: {
        padding: 20,
        paddingBottom: 40,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        width: '100%',
        maxHeight: height * 0.6,
    },
    headerTitle: {
        marginBottom: 20,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
        paddingHorizontal: 10,
    },
    rowLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.medium,
    },
    rowValue: {
        fontSize: 16,
        marginRight: 10,
    },
    cancelButton: {
        marginTop: 20,
        padding: 15,
        alignItems: 'center',
        borderRadius: 10,
        backgroundColor: '#f0f0f0',
    },
    cancelText: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#666'
    }
});