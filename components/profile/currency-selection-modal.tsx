import { ThemedText } from '@/components/themed-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

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
    const tintColor = Colors.light.tint;

    const handleSelect = (currencyValue: string) => {
        onSelect(currencyValue);
        onClose();
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title="Select Currency"
            height="50%"
        >
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {CURRENCY_OPTIONS.map(option => {
                    const isSelected = currentCurrency === option.value;
                    return (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.row,
                                isSelected && { backgroundColor: tintColor + '10' } // 10% opacity tint
                            ]}
                            onPress={() => handleSelect(option.value)}
                            activeOpacity={0.7}
                        >
                            <ThemedText
                                style={[
                                    styles.rowLabel,
                                    isSelected && { color: tintColor, fontFamily: Fonts.bold }
                                ]}
                            >
                                {option.label}
                            </ThemedText>

                            <ThemedText
                                style={[
                                    styles.rowValue,
                                    isSelected && { color: tintColor, fontFamily: Fonts.bold }
                                ]}
                            >
                                {option.value}
                            </ThemedText>

                            {isSelected && (
                                <IconSymbol name="checkmark.circle.fill" size={20} color={tintColor} />
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#E0E0E0',
        paddingHorizontal: 12,
        borderRadius: 8, // Adds a subtle touch when highlighted
    },
    rowLabel: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.medium,
    },
    rowValue: {
        fontSize: 16,
        marginRight: 12,
        color: '#666',
    },
});