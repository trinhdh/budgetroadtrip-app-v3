import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { SwipeableExpenseRow } from '@/components/ui/swipeable-expense-row';
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    expenses: any[];
    onSelectExpense: (expense: any) => void;
    onDeleteExpense: (id: string) => void; // Added prop
};

export function AllExpensesModal({ visible, onClose, expenses, onSelectExpense, onDeleteExpense }: Props) {

    const handleSelect = (item: any) => {
        onClose();
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
                    <SwipeableExpenseRow
                        item={item}
                        onPress={handleSelect}
                        onDelete={onDeleteExpense}
                    />
                )}
            // Removed ItemSeparatorComponent as SwipeableRow handles its own border
            />
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    listContent: { paddingHorizontal: 0, paddingBottom: 40 }, // Remove horizontal padding so swipe bg touches edges
});