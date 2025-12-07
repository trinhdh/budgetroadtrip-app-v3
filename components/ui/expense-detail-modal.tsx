import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    expense: any;
    onAddReceipt?: (expenseId: string) => void; // Optional prop for future logic
};

export function ExpenseDetailModal({ visible, onClose, expense, onAddReceipt }: Props) {
    if (!expense) return null;

    const handleAddReceipt = () => {
        if (onAddReceipt) {
            onAddReceipt(expense.id);
        } else {
            // Placeholder action
            Alert.alert("Add Receipt", "This feature is not connected yet.");
        }
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title="Expense Details"
            height="70%"
        >
            <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                {/* Header: Amount & Title */}
                <View style={styles.header}>
                    <View style={[styles.iconCircle, { backgroundColor: getCategoryColor(expense.category) + '20' }]}>
                        <IconSymbol name={getCategoryIcon(expense.category)} size={32} color={getCategoryColor(expense.category)} />
                    </View>
                    <Text style={styles.amount}>-${parseFloat(expense.amount).toFixed(2)}</Text>
                    <Text style={styles.title}>{expense.title}</Text>
                </View>

                <View style={styles.divider} />

                {/* Meta Data Grid */}
                <View style={styles.grid}>
                    <View style={styles.metaItem}>
                        <Text style={styles.label}>Category</Text>
                        <Text style={styles.value}>{expense.category}</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.label}>Date</Text>
                        <Text style={styles.value}>{expense.date}</Text>
                    </View>
                </View>

                {/* Added By Section */}
                <View style={styles.userSection}>
                    <Text style={styles.label}>Added By</Text>
                    <View style={styles.userRow}>
                        <Image source={{ uri: expense.addedBy?.avatar }} style={styles.avatar} />
                        <Text style={styles.userName}>{expense.addedBy?.name || 'You'}</Text>
                    </View>
                </View>

                {/* Receipt Section */}
                <View style={styles.receiptSection}>
                    <Text style={styles.label}>Receipt</Text>
                    {expense.hasReceipt || expense.receiptImage ? (
                        <View style={styles.receiptContainer}>
                            <Image
                                source={{ uri: expense.receiptImage || 'https://templates.invoicehome.com/receipt-template-us-neat-750px.png' }}
                                style={styles.receiptImage}
                                contentFit="contain"
                            />
                        </View>
                    ) : (
                        // CHANGED: Replaced static view with a button
                        <TouchableOpacity
                            style={styles.addReceiptButton}
                            onPress={handleAddReceipt}
                            activeOpacity={0.7}
                        >
                            <IconSymbol name="plus" size={24} color={Colors.light.tint} />
                            <Text style={styles.addReceiptText}>Add Receipt</Text>
                        </TouchableOpacity>
                    )}
                </View>

            </ScrollView>
        </BottomSheetModal>
    );
}

// Helpers
const getCategoryColor = (cat: string) => {
    switch (cat) {
        case 'Fuel': return '#FF9F1C';
        case 'Food': return '#E71D36';
        case 'Hotel': return '#2EC4B6';
        case 'Activities': return '#7209B7';
        default: return '#808080';
    }
};

const getCategoryIcon = (cat: string) => {
    switch (cat) {
        case 'Fuel': return 'speedometer';
        case 'Food': return 'leaf';
        case 'Hotel': return 'bed.double.fill'; // Changed to match mapping if needed, or keep 'house.fill'
        case 'Activities': return 'wand.and.stars';
        default: return 'circle.grid.2x2.fill';
    }
};

const styles = StyleSheet.create({
    container: { paddingHorizontal: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginTop: 20, marginBottom: 20 },
    iconCircle: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    amount: { fontSize: 36, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    title: { fontSize: 20, color: '#666', fontFamily: Fonts.medium },
    divider: { height: 1, backgroundColor: '#eee', marginVertical: 20 },
    grid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    metaItem: { flex: 1 },
    label: { fontSize: 12, textTransform: 'uppercase', color: '#999', fontWeight: 'bold', marginBottom: 8 },
    value: { fontSize: 16, color: '#333', fontWeight: '600' },
    userSection: { marginBottom: 25 },
    userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    avatar: { width: 32, height: 32, borderRadius: 16, marginRight: 10, borderWidth: 1, borderColor: '#eee' },
    userName: { fontSize: 16, color: '#333', fontWeight: '500' },
    receiptSection: { flex: 1 },
    receiptContainer: {
        height: 300, backgroundColor: '#f9f9f9', borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: '#eee', marginTop: 5
    },
    receiptImage: { flex: 1, width: '100%', backgroundColor: '#fff' },

    // NEW STYLES for the button
    addReceiptButton: {
        height: 100,
        backgroundColor: Colors.light.tint + '10', // 10% opacity tint background
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        borderStyle: 'dashed',
        borderWidth: 1.5,
        borderColor: Colors.light.tint
    },
    addReceiptText: {
        color: Colors.light.tint,
        marginTop: 8,
        fontFamily: Fonts.medium,
        fontSize: 16
    }
});