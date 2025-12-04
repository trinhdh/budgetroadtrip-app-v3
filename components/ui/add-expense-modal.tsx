import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReceiptCameraModal } from '@/components/ui/receipt-camera-modal';
import { Colors } from '@/constants/theme';
import React, { useState } from 'react';
import {
    Alert,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    itineraryDays: any[];
};

const CATEGORIES = [
    { id: 'Fuel', icon: 'speedometer', color: '#FF9F1C' },
    { id: 'Food', icon: 'leaf', color: '#E71D36' },
    { id: 'Hotel', icon: 'house.fill', color: '#2EC4B6' },
    { id: 'Activities', icon: 'wand.and.stars', color: '#7209B7' },
    { id: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export function AddExpenseModal({ visible, onClose, itineraryDays }: Props) {
    // Form State
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Food');
    const [selectedDay, setSelectedDay] = useState(1);
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    // Camera State
    const [cameraVisible, setCameraVisible] = useState(false);

    const handleReceiptCaptured = (uri: string, data?: any) => {
        setReceiptUri(uri);
        if (data) {
            // Auto-fill form from "OCR"
            if (data.amount) setAmount(data.amount);
            if (data.merchant) setTitle(data.merchant);
            if (data.category) setSelectedCategory(data.category);
        }
        setCameraVisible(false);
    };

    const handleSave = () => {
        const numericAmount = parseFloat(amount);

        // Validation: Check if amount is valid and greater than 0
        if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
            return;
        }

        console.log({
            amount: numericAmount,
            title: title || 'Expense', // Default title if empty
            category: selectedCategory,
            day: selectedDay,
            receipt: receiptUri
        });

        // Reset form
        setAmount('');
        setTitle('');
        setReceiptUri(null);
        onClose();
    };

    // Derived state for button styling
    const isValid = parseFloat(amount) > 0;

    return (
        <>
            <BottomSheetModal
                isVisible={visible}
                onClose={onClose}
                title="Add New Expense"
                height="85%"
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

                    {/* --- 1. AMOUNT INPUT --- */}
                    <View style={styles.amountContainer}>
                        <Text style={styles.currencySymbol}>$</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            placeholderTextColor="#ccc"
                            keyboardType="decimal-pad"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus={false}
                        />
                    </View>

                    {/* --- 2. TITLE INPUT (Manual Entry Priority) --- */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Starbucks, Shell Gas"
                            placeholderTextColor="#999"
                            value={title}
                            onChangeText={setTitle}
                        />
                    </View>

                    {/* --- 3. RECEIPT ACTION (Secondary) --- */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Receipt (Optional)</Text>
                        <TouchableOpacity
                            style={styles.scanButton}
                            onPress={() => setCameraVisible(true)}
                        >
                            {receiptUri ? (
                                <View style={styles.receiptPreview}>
                                    <RNImage source={{ uri: receiptUri }} style={styles.thumb} />
                                    <Text style={styles.scanText}>Receipt Attached</Text>
                                    <IconSymbol name="checkmark.circle.fill" size={20} color="#2E7D32" style={{ marginLeft: 10 }} />
                                </View>
                            ) : (
                                <>
                                    <IconSymbol name="camera.viewfinder" size={20} color={Colors.light.tint} />
                                    <Text style={styles.scanText}>Scan Receipt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    {/* --- 4. CATEGORY SELECTOR --- */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.catPill,
                                        selectedCategory === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <IconSymbol
                                        name={cat.icon as any}
                                        size={16}
                                        color={selectedCategory === cat.id ? cat.color : '#999'}
                                    />
                                    <Text style={[
                                        styles.catText,
                                        selectedCategory === cat.id && { color: cat.color, fontWeight: 'bold' }
                                    ]}>
                                        {cat.id}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* --- 5. DAY SELECTOR --- */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Assign to Day</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
                            {itineraryDays.map((day) => (
                                <TouchableOpacity
                                    key={day.day}
                                    style={[
                                        styles.dayCard,
                                        selectedDay === day.day && { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint }
                                    ]}
                                    onPress={() => setSelectedDay(day.day)}
                                >
                                    <Text style={[
                                        styles.dayNum,
                                        selectedDay === day.day && { color: '#fff' }
                                    ]}>Day {day.day}</Text>
                                    <Text style={[
                                        styles.dayTitle,
                                        selectedDay === day.day && { color: 'rgba(255,255,255,0.8)' }
                                    ]} numberOfLines={1}>
                                        {day.title.split('->')[0]}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>

                {/* Footer Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.saveButton, { opacity: isValid ? 1 : 0.5 }]}
                        onPress={handleSave}
                        disabled={!isValid}
                    >
                        <Text style={styles.saveText}>Save Expense</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetModal>

            <ReceiptCameraModal
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onCapture={handleReceiptCaptured}
            />
        </>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: 20 },

    // Amount
    amountContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
    currencySymbol: { fontSize: 32, fontWeight: '600', color: '#333', marginRight: 5 },
    amountInput: { fontSize: 48, fontWeight: 'bold', color: '#333', minWidth: 100, textAlign: 'center' },

    // Scan Button
    scanButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F0F2F5', padding: 12, borderRadius: 12,
    },
    scanText: { marginLeft: 8, fontSize: 16, color: Colors.light.tint, fontWeight: '600' },
    receiptPreview: { flexDirection: 'row', alignItems: 'center' },
    thumb: { width: 30, height: 30, borderRadius: 4, marginRight: 8 },

    // Inputs
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase' },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, backgroundColor: '#fff' },

    // Categories
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    catPill: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 20, borderWidth: 1, borderColor: '#eee', gap: 6
    },
    catText: { fontSize: 14, color: '#666' },

    // Day Selector
    dayScroll: { gap: 10, paddingRight: 20 },
    dayCard: {
        width: 100, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#eee',
        backgroundColor: '#fff', alignItems: 'center'
    },
    dayNum: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    dayTitle: { fontSize: 11, color: '#888' },

    // Footer
    footer: {
        position: 'absolute', bottom: 20, left: 20, right: 20,
    },
    saveButton: {
        backgroundColor: Colors.light.tint, padding: 16, borderRadius: 16, alignItems: 'center',
        shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },
    saveText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});