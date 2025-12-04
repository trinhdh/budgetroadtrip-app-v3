import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    expenses: any[];
    onSelectExpense: (expense: any) => void;
};

export function AllExpensesModal({ visible, onClose, expenses, onSelectExpense }: Props) {

    const handleSelect = (item: any) => {
        onClose(); // Close list
        // Small timeout to allow animation to start before opening detail, or handle stacking in parent
        setTimeout(() => {
            onSelectExpense(item);
        }, 100);
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title="All Expenses"
            height="85%"
        >
            <FlatList
                data={expenses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.expenseRow} onPress={() => handleSelect(item)}>
                        <View style={[styles.receiptBadge, { backgroundColor: item.hasReceipt ? '#E8F5E9' : '#FFEBEE' }]}>
                            <IconSymbol
                                name="dollarsign"
                                size={18}
                                color={item.hasReceipt ? '#2E7D32' : '#C62828'}
                            />
                        </View>

                        <View style={styles.expenseInfo}>
                            <Text style={styles.expenseTitle}>{item.title}</Text>
                            <View style={styles.expenseMetaRow}>
                                <Text style={styles.expenseDate}>{item.date}</Text>
                                <Text style={styles.categoryTag}> • {item.category}</Text>
                            </View>
                        </View>

                        <View style={styles.avatarGroup}>
                            <Image
                                source={{ uri: item.addedBy?.avatar }}
                                style={styles.smallAvatar}
                            />
                            <Text style={styles.expenseAmount}>-${parseFloat(item.amount).toFixed(2)}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    separator: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 0 },

    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 12,
    },
    receiptBadge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    expenseInfo: {
        flex: 1,
    },
    expenseTitle: {
        fontSize: 16,
        fontFamily: Fonts.medium,
        color: '#333',
        marginBottom: 2,
    },
    expenseMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expenseDate: {
        fontSize: 13,
        color: '#808080',
    },
    categoryTag: {
        fontSize: 13,
        color: '#808080',
    },

    avatarGroup: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 4,
    },
    smallAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#fff',
    },
    expenseAmount: {
        fontSize: 16,
        fontFamily: Fonts.bold,
        color: '#E71D36',
    },
});