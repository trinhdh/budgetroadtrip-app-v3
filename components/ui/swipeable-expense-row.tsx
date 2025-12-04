import { IconSymbol } from '@/components/ui/icon-symbol';
import { Fonts } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

type Props = {
    item: any;
    onPress: (item: any) => void;
    onDelete: (id: string) => void;
};

export function SwipeableExpenseRow({ item, onPress, onDelete }: Props) {

    const handleDelete = () => {
        Alert.alert(
            "Delete Expense",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => onDelete(item.id)
                }
            ]
        );
    };

    const renderRightActions = (_progress: any, dragX: any) => {
        return (
            <TouchableOpacity style={styles.deleteAction} onPress={handleDelete}>
                <IconSymbol name="trash.fill" size={24} color="#fff" />
                <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
        );
    };

    return (
        <Swipeable renderRightActions={renderRightActions} containerStyle={styles.swipeContainer}>
            <TouchableOpacity style={styles.expenseRow} onPress={() => onPress(item)} activeOpacity={0.9}>
                <View style={[styles.receiptBadge, { backgroundColor: item.hasReceipt ? '#E8F5E9' : '#FFEBEE' }]}>
                    <IconSymbol name="dollarsign" size={18} color={item.hasReceipt ? '#2E7D32' : '#C62828'} />
                </View>

                <View style={styles.expenseInfo}>
                    <Text style={styles.expenseTitle}>{item.title}</Text>
                    <View style={styles.expenseMetaRow}>
                        <Text style={styles.expenseDate}>{item.date}</Text>
                        {!item.hasReceipt && (
                            <View style={styles.missingReceiptTag}>
                                <Text style={styles.missingReceiptText}>No Receipt</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.avatarGroup}>
                    <Image source={{ uri: item.addedBy?.avatar }} style={styles.smallAvatar} />
                    <Text style={styles.expenseAmount}>-${parseFloat(item.amount.toString()).toFixed(2)}</Text>
                </View>
            </TouchableOpacity>
        </Swipeable>
    );
}

const styles = StyleSheet.create({
    swipeContainer: {
        backgroundColor: '#F9FAFB', // Match background to hide swipe layer
    },
    deleteAction: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    deleteText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginTop: 4,
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 12,
        backgroundColor: '#fff', // Important for swipe overlay
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    receiptBadge: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    expenseInfo: { flex: 1 },
    expenseTitle: { fontSize: 16, fontFamily: Fonts.medium, marginBottom: 2, color: '#333' },
    expenseMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    expenseDate: { fontSize: 13, color: '#808080' },
    missingReceiptTag: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    missingReceiptText: { fontSize: 10, color: '#C62828', fontWeight: 'bold' },
    avatarGroup: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
    smallAvatar: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#fff' },
    expenseAmount: { fontSize: 16, fontFamily: Fonts.bold, color: '#E71D36' },
});