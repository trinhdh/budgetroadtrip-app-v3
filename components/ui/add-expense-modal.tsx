import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReceiptCameraModal } from '@/components/ui/receipt-camera-modal';
import { Colors, Fonts } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    itineraryDays: any[];
    tripStartDate?: Date | string | null;
    currentDayIndex?: number;
    initialData?: any; // <--- ADDED: To support editing
    onSave: (expenseData: any) => void;
};

const CATEGORIES = [
    { id: 'Fuel', icon: 'speedometer', color: '#FF9F1C' },
    { id: 'Food', icon: 'leaf', color: '#E71D36' },
    { id: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'Activities', icon: 'wand.and.stars', color: '#7209B7' },
    { id: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export function AddExpenseModal({
    visible,
    onClose,
    itineraryDays,
    tripStartDate,
    currentDayIndex,
    initialData, // <--- Destructure new prop
    onSave
}: Props) {
    // Form State
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Food');
    const [selectedDay, setSelectedDay] = useState(1);
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    // Camera State
    const [cameraVisible, setCameraVisible] = useState(false);

    // Effect: Handle Reset (Add Mode) vs Pre-fill (Edit Mode)
    useEffect(() => {
        if (visible) {
            if (initialData) {
                // --- EDIT MODE ---
                setAmount(initialData.amount ? String(initialData.amount) : '');
                setTitle(initialData.title || '');
                // Handle case capitalization safety
                const cat = initialData.category
                    ? initialData.category.charAt(0).toUpperCase() + initialData.category.slice(1).toLowerCase()
                    : 'Food';
                setSelectedCategory(CATEGORIES.some(c => c.id === cat) ? cat : 'Food');

                setReceiptUri(initialData.receiptImage || initialData.receiptUri || null);

                // If editing, use the day from the item, otherwise fallback to current context
                setSelectedDay(initialData.day || (currentDayIndex !== undefined ? currentDayIndex + 1 : 1));
            } else {
                // --- ADD MODE (Reset) ---
                setAmount('');
                setTitle('');
                setSelectedCategory('Food');
                setReceiptUri(null);
                // Default to Day 1, or convert 0-based index to 1-based day
                setSelectedDay(currentDayIndex !== undefined ? currentDayIndex + 1 : 1);
            }
        }
    }, [visible, currentDayIndex, initialData]);

    // Helper to format date: "Dec 10"
    const getFormattedDate = (dayNum: number) => {
        if (!tripStartDate) return null;

        const date = new Date(tripStartDate);
        // Add days (Day 1 is start date, so add dayNum - 1)
        date.setDate(date.getDate() + (dayNum - 1));

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const handleReceiptCaptured = (uri: string, data?: any) => {
        setReceiptUri(uri);
        if (data) {
            if (data.amount) setAmount(data.amount);
            if (data.merchant) setTitle(data.merchant);
            if (data.category) setSelectedCategory(data.category);
        }
        setCameraVisible(false);
    };

    const handleSave = () => {
        const numericAmount = parseFloat(amount);

        if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
            return;
        }

        const expenseData = {
            // Include ID if editing so parent knows which doc to update
            ...(initialData?.id && { id: initialData.id }),

            amount: numericAmount,
            title: title || 'Expense',
            category: selectedCategory,
            day: selectedDay,
            receiptImage: receiptUri,
            // Generate date string for display
            date: getFormattedDate(selectedDay) || `Day ${selectedDay}`,
        };

        onSave(expenseData);
        onClose();
    };

    const isValid = parseFloat(amount) > 0 && title.trim().length > 0;
    const isEditing = !!initialData;

    return (
        <>
            <BottomSheetModal
                isVisible={visible}
                onClose={onClose}
                // Dynamic Title
                title={isEditing ? "Edit Expense" : "Add New Expense"}
                height="90%"
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1 }}>
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >

                                {/* 1. HERO AMOUNT INPUT */}
                                <View style={styles.amountContainer}>
                                    <Text style={styles.currencySymbol}>$</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#E0E0E0"
                                        keyboardType="decimal-pad"
                                        value={amount}
                                        onChangeText={setAmount}
                                        autoFocus={false} // Don't autofocus on edit to prevent jarring jumps
                                    />
                                </View>

                                {/* 2. CATEGORY SELECTOR */}
                                <Text style={styles.sectionLabel}>Category</Text>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.categoryScroll}
                                >
                                    {CATEGORIES.map((cat) => (
                                        <TouchableOpacity
                                            key={cat.id}
                                            style={[
                                                styles.categoryCard,
                                                selectedCategory === cat.id && {
                                                    backgroundColor: cat.color,
                                                    borderColor: cat.color
                                                }
                                            ]}
                                            onPress={() => setSelectedCategory(cat.id)}
                                            activeOpacity={0.8}
                                        >
                                            <View style={[
                                                styles.iconCircle,
                                                selectedCategory === cat.id
                                                    ? { backgroundColor: 'rgba(255,255,255,0.2)' }
                                                    : { backgroundColor: cat.color + '15' }
                                            ]}>
                                                <IconSymbol
                                                    name={cat.icon as any}
                                                    size={20}
                                                    color={selectedCategory === cat.id ? '#fff' : cat.color}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.categoryText,
                                                selectedCategory === cat.id && { color: '#fff', fontWeight: 'bold' }
                                            ]}>
                                                {cat.id}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={styles.divider} />

                                {/* 3. DETAILS SECTION */}
                                <View style={styles.formSection}>
                                    {/* Description */}
                                    <View style={styles.inputContainer}>
                                        <IconSymbol name="pencil" size={20} color="#999" style={{ marginRight: 12 }} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="Description (e.g. Starbucks)"
                                            placeholderTextColor="#999"
                                            value={title}
                                            onChangeText={setTitle}
                                        />
                                    </View>

                                    {/* Day Selection - HIDDEN if currentDayIndex is provided AND we are NOT editing (or editing same day) */}
                                    {/* Logic: If adding new from DayView, hide day picker. If editing, maybe show it? For now following same logic: hide if context provided */}
                                    {currentDayIndex === undefined && (
                                        <>
                                            <Text style={[styles.sectionLabel, { marginTop: 24, marginBottom: 12 }]}>
                                                Assign to Day
                                            </Text>
                                            <ScrollView
                                                horizontal
                                                showsHorizontalScrollIndicator={false}
                                                contentContainerStyle={styles.dayScroll}
                                            >
                                                {itineraryDays.map((day) => {
                                                    const isSelected = selectedDay === day.day;
                                                    const dateStr = getFormattedDate(day.day);

                                                    return (
                                                        <TouchableOpacity
                                                            key={day.day}
                                                            style={[
                                                                styles.dayPill,
                                                                isSelected && {
                                                                    backgroundColor: Colors.light.tint,
                                                                    borderColor: Colors.light.tint
                                                                }
                                                            ]}
                                                            onPress={() => setSelectedDay(day.day)}
                                                        >
                                                            <Text style={[
                                                                styles.dayPillText,
                                                                isSelected && { color: '#fff', fontWeight: 'bold' }
                                                            ]}>
                                                                Day {day.day}
                                                            </Text>
                                                            {dateStr && (
                                                                <Text style={[
                                                                    styles.dayPillDate,
                                                                    isSelected ? { color: 'rgba(255,255,255,0.8)' } : { color: '#999' }
                                                                ]}>
                                                                    {dateStr}
                                                                </Text>
                                                            )}
                                                        </TouchableOpacity>
                                                    );
                                                })}
                                            </ScrollView>
                                        </>
                                    )}

                                    {/* Receipt Button */}
                                    <TouchableOpacity
                                        style={[
                                            styles.receiptButton,
                                            receiptUri && styles.receiptButtonActive,
                                            currentDayIndex !== undefined && { marginTop: 24 }
                                        ]}
                                        onPress={() => setCameraVisible(true)}
                                        activeOpacity={0.7}
                                    >
                                        {receiptUri ? (
                                            <View style={styles.receiptContent}>
                                                <RNImage source={{ uri: receiptUri }} style={styles.receiptPreview} />
                                                <Text style={styles.receiptTextActive}>Receipt Attached</Text>
                                                <IconSymbol name="checkmark.circle.fill" size={22} color={Colors.light.tint} style={{ marginLeft: 'auto' }} />
                                            </View>
                                        ) : (
                                            <View style={styles.receiptContent}>
                                                <View style={[styles.iconCircle, { backgroundColor: '#F0F2F5' }]}>
                                                    <IconSymbol name="camera.viewfinder" size={20} color={Colors.light.tint} />
                                                </View>
                                                <Text style={styles.receiptText}>Scan Receipt</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>

                                <View style={{ height: 100 }} />
                            </ScrollView>

                            {/* Footer Button */}
                            <View style={styles.footer}>
                                <TouchableOpacity
                                    style={[
                                        styles.saveButton,
                                        { backgroundColor: isValid ? Colors.light.tint : '#ccc' }
                                    ]}
                                    onPress={handleSave}
                                    disabled={!isValid}
                                >
                                    <Text style={styles.saveButtonText}>
                                        {isEditing ? "Update Expense" : "Save Expense"}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
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
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

    // Amount
    amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 30 },
    currencySymbol: { fontSize: 40, fontWeight: 'bold', color: '#BDBDBD', marginRight: 4, marginTop: 4 },
    amountInput: { fontSize: 64, fontWeight: 'bold', color: '#333', minWidth: 100, textAlign: 'center' },

    // Categories
    sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
    categoryScroll: { gap: 12, paddingRight: 20 },
    categoryCard: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 10, paddingHorizontal: 16,
        borderRadius: 24, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff',
        gap: 8, height: 50
    },
    iconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    categoryText: { fontSize: 14, color: '#444', fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 24 },

    // Form
    formSection: { gap: 16 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16,
        paddingHorizontal: 16, height: 56, backgroundColor: '#FAFAFA'
    },
    textInput: { flex: 1, fontSize: 16, color: '#333', fontFamily: Fonts.regular },

    // Day Pills
    dayScroll: { gap: 8, paddingRight: 20 },
    dayPill: {
        paddingVertical: 10, paddingHorizontal: 16, // Increased padding
        borderRadius: 16, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff',
        alignItems: 'center', minWidth: 80 // Center text
    },
    dayPillText: { fontSize: 15, color: '#333', fontWeight: '600' },
    dayPillDate: { fontSize: 11, marginTop: 2, fontWeight: '500' }, // New date style

    // Receipt
    receiptButton: {
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16,
        padding: 12, backgroundColor: '#fff', borderStyle: 'dashed', marginTop: 10
    },
    receiptButtonActive: {
        borderColor: Colors.light.tint, backgroundColor: Colors.light.tint + '10', borderStyle: 'solid'
    },
    receiptContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    receiptText: { fontSize: 16, color: '#666', fontWeight: '500' },
    receiptTextActive: { fontSize: 16, color: Colors.light.tint, fontWeight: '600' },
    receiptPreview: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },

    // Footer
    footer: {
        position: 'absolute', bottom: 20, left: 20, right: 20,
    },
    saveButton: {
        height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4
    },
    saveButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});