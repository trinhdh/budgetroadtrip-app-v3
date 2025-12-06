import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { Image } from 'expo-image';
import React from 'react';
import { Alert, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ... (keep your existing types)
type Member = { id: string; name: string; avatar: string };
type Debt = { from: Member; to: Member; amount: number };

type Props = {
    visible: boolean;
    onClose: () => void;
    debts: Debt[];
    currentUser: string;
    onSettle: (debt: Debt) => void; // <--- 1. NEW PROP
};

export function BalancesModal({ visible, onClose, debts, currentUser, onSettle }: Props) {

    // Filter debts
    const myDebts = debts.filter(d => d.from.id === currentUser); // I owe others
    const owedToMe = debts.filter(d => d.to.id === currentUser);  // Others owe me

    const handleRequest = async (debt: Debt) => {
        try {
            await Share.share({
                message: `Hey ${debt.from.name}, please pay me $${debt.amount.toFixed(2)} for the trip expenses.`,
                title: 'Request Payment'
            });
        } catch (error) {
            Alert.alert("Error", "Could not share request");
        }
    };

    // 2. Logic to confirm settlement
    const confirmSettlement = (debt: Debt) => {
        Alert.alert(
            "Confirm Payment",
            `Has ${debt.from.name} paid you $${debt.amount.toFixed(2)}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Yes, Mark Paid",
                    onPress: () => onSettle(debt) // Calls parent function
                }
            ]
        );
    };

    const renderDebtRow = ({ item, isOwedToMe }: { item: Debt, isOwedToMe: boolean }) => (
        <View style={styles.debtCard}>
            <View style={styles.userRow}>
                <Image source={{ uri: isOwedToMe ? item.from.avatar : item.to.avatar }} style={styles.avatar} />
                <View>
                    <Text style={styles.debtText}>
                        {isOwedToMe ? `${item.from.name} owes you` : `You owe ${item.to.name}`}
                    </Text>
                    <Text style={[styles.amount, { color: isOwedToMe ? '#2E7D32' : '#C62828' }]}>
                        ${item.amount.toFixed(2)}
                    </Text>
                </View>
            </View>

            {/* 3. Updated Actions for Creditor */}
            {isOwedToMe ? (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.outlineButton} onPress={() => handleRequest(item)}>
                        <Text style={styles.outlineText}>Request</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionButton, { backgroundColor: '#2E7D32' }]}
                        onPress={() => confirmSettlement(item)}
                    >
                        <Text style={styles.actionText}>Mark Paid</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Unpaid</Text>
                </View>
            )}
        </View>
    );

    return (
        <BottomSheetModal isVisible={visible} onClose={onClose} title="Balances" height="60%">
            <View style={{ flex: 1, paddingHorizontal: 20 }}>
                {owedToMe.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Owed to You</Text>
                        {owedToMe.map((d, i) => <View key={i}>{renderDebtRow({ item: d, isOwedToMe: true })}</View>)}
                    </View>
                )}

                {myDebts.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>You Owe</Text>
                        {myDebts.map((d, i) => <View key={i}>{renderDebtRow({ item: d, isOwedToMe: false })}</View>)}
                    </View>
                )}

                {owedToMe.length === 0 && myDebts.length === 0 && (
                    <View style={styles.emptyState}>
                        <IconSymbol name="checkmark.circle.fill" size={48} color={Colors.light.tint} />
                        <Text style={styles.emptyText}>You are all settled up!</Text>
                    </View>
                )}
            </View>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#888', marginBottom: 12, textTransform: 'uppercase' },
    debtCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 16, backgroundColor: '#f9f9f9', borderRadius: 16, marginBottom: 10,
        borderWidth: 1, borderColor: '#eee'
    },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 40, height: 40, borderRadius: 20 },
    debtText: { fontSize: 14, color: '#333', fontFamily: Fonts.medium },
    amount: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },

    // New Button Styles
    actionRow: { flexDirection: 'row', gap: 8 },
    actionButton: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center'
    },
    actionText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    outlineButton: {
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
        borderWidth: 1, borderColor: '#ccc',
        alignItems: 'center', justifyContent: 'center'
    },
    outlineText: { color: '#666', fontWeight: 'bold', fontSize: 12 },

    statusBadge: { backgroundColor: '#eee', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 12, color: '#888' },
    emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyText: { marginTop: 16, fontSize: 16, color: '#666', fontFamily: Fonts.medium }
});