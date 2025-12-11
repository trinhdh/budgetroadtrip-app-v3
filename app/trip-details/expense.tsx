import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReceiptCameraModal } from '@/components/ui/receipt-camera-modal';
import { Colors, Fonts } from '@/constants/theme';
import { Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripService } from '@/services/trip-service';
import { Image as ExpoImage } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

const CATEGORIES = [
    { id: 'Fuel', icon: 'speedometer', color: '#FF9F1C' },
    { id: 'Food', icon: 'leaf', color: '#E71D36' },
    { id: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'Activities', icon: 'camera.fill', color: '#7209B7' },
    { id: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export default function ExpenseScreen() {
    const router = useRouter();
    const { tripId, expense } = useLocalSearchParams();
    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const initialData = expense ? JSON.parse(Array.isArray(expense) ? expense[0] : expense) : null;
    const isEditing = !!initialData;

    // Trip Data (needed for dates & itinerary)
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loadingTrip, setLoadingTrip] = useState(true);

    // Form State
    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Food');
    const [selectedDay, setSelectedDay] = useState(1);
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    // Camera State
    const [cameraVisible, setCameraVisible] = useState(false);
    const [saving, setSaving] = useState(false);

    // Fetch Trip Data
    useEffect(() => {
        if (!tripId) return;
        const id = Array.isArray(tripId) ? tripId[0] : tripId;

        const unsubscribe = TripService.subscribeToTrip(id, (data) => {
            setTrip(data);
            setLoadingTrip(false);
        });

        return () => unsubscribe();
    }, [tripId]);

    // Initialize Form
    useEffect(() => {
        if (initialData) {
            setAmount(initialData.amount ? String(initialData.amount) : '');
            setTitle(initialData.title || '');
            const cat = initialData.category
                ? initialData.category.charAt(0).toUpperCase() + initialData.category.slice(1).toLowerCase()
                : 'Food';
            setSelectedCategory(CATEGORIES.some(c => c.id === cat) ? cat : 'Food');
            setReceiptUri(initialData.receiptImage || initialData.receiptUri || null);
            setSelectedDay(initialData.day || 1);
        }
    }, []);

    const getFormattedDate = (dayNum: number) => {
        if (!trip?.startDate) return null;
        const date = new Date(trip.startDate);
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

    const handleSave = async () => {
        if (!user || !tripId) return;
        const numericAmount = parseFloat(amount);

        if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
            return;
        }

        setSaving(true);
        const tId = Array.isArray(tripId) ? tripId[0] : tripId;

        const expenseData = {
            amount: numericAmount,
            title: title || 'Expense',
            category: selectedCategory,
            day: selectedDay,
            receiptImage: receiptUri,
            date: getFormattedDate(selectedDay) || `Day ${selectedDay}`,
            // Preserve creation data if editing, else new
            addedBy: initialData?.addedBy || {
                uid: user.uid,
                name: user.displayName || 'User',
                avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
            },
            createdAt: initialData?.createdAt ? new Date(initialData.createdAt) : new Date(),
            hasReceipt: !!receiptUri
        };

        try {
            if (isEditing && initialData.id) {
                await TripService.updateExpense(tId, initialData.id, expenseData);
            } else {
                await TripService.addExpense(tId, expenseData);
            }
            router.back();
        } catch (error) {
            Alert.alert("Error", "Failed to save expense.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingTrip) {
        return (
            <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </ThemedView>
        );
    }

    const isValid = parseFloat(amount) > 0;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <ThemedText style={{ color: colors.text }}>Cancel</ThemedText>
                </TouchableOpacity>
                <ThemedText type="subtitle">{isEditing ? 'Edit Expense' : 'New Expense'}</ThemedText>
                <TouchableOpacity onPress={handleSave} disabled={!isValid || saving}>
                    {saving ? (
                        <ActivityIndicator color={colors.tint} />
                    ) : (
                        <ThemedText style={{ color: isValid ? colors.tint : '#ccc', fontWeight: 'bold' }}>Save</ThemedText>
                    )}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>
                            {/* Amount Input */}
                            <View style={styles.amountContainer}>
                                <ThemedText style={styles.currencySymbol}>$</ThemedText>
                                <TextInput
                                    style={[styles.amountInput, { color: colors.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor="#E0E0E0"
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                    autoFocus={!isEditing}
                                />
                            </View>

                            {/* Categories */}
                            <ThemedText style={styles.sectionLabel}>Category</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                                {CATEGORIES.map((cat) => (
                                    <TouchableOpacity
                                        key={cat.id}
                                        style={[
                                            styles.categoryCard,
                                            selectedCategory === cat.id && { backgroundColor: cat.color, borderColor: cat.color }
                                        ]}
                                        onPress={() => setSelectedCategory(cat.id)}
                                    >
                                        <View style={[
                                            styles.iconCircle,
                                            selectedCategory === cat.id ? { backgroundColor: 'rgba(255,255,255,0.2)' } : { backgroundColor: cat.color + '15' }
                                        ]}>
                                            <IconSymbol name={cat.icon as any} size={20} color={selectedCategory === cat.id ? '#fff' : cat.color} />
                                        </View>
                                        <ThemedText style={[styles.categoryText, selectedCategory === cat.id && { color: '#fff', fontWeight: 'bold' }]}>
                                            {cat.id}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={styles.divider} />

                            {/* Details */}
                            <View style={styles.formSection}>
                                <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.icon + '40' }]}>
                                    <IconSymbol name="pencil" size={20} color="#999" style={{ marginRight: 12 }} />
                                    <TextInput
                                        style={[styles.textInput, { color: colors.text }]}
                                        placeholder="Description (e.g. Starbucks)"
                                        placeholderTextColor="#999"
                                        value={title}
                                        onChangeText={setTitle}
                                    />
                                </View>

                                {/* Day Selection */}
                                <ThemedText style={[styles.sectionLabel, { marginTop: 24, marginBottom: 12 }]}>Assign to Day</ThemedText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayScroll}>
                                    {trip?.itinerary?.map((day) => {
                                        const isSelected = selectedDay === day.day;
                                        const dateStr = getFormattedDate(day.day);
                                        return (
                                            <TouchableOpacity
                                                key={day.day}
                                                style={[
                                                    styles.dayPill,
                                                    isSelected && { backgroundColor: colors.tint, borderColor: colors.tint }
                                                ]}
                                                onPress={() => setSelectedDay(day.day)}
                                            >
                                                <ThemedText style={[styles.dayPillText, isSelected && { color: '#fff' }]}>
                                                    Day {day.day}
                                                </ThemedText>
                                                {dateStr && (
                                                    <ThemedText style={[styles.dayPillDate, isSelected ? { color: 'rgba(255,255,255,0.8)' } : { color: '#999' }]}>
                                                        {dateStr}
                                                    </ThemedText>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>

                                {/* Receipt */}
                                <TouchableOpacity
                                    style={[
                                        styles.receiptButton,
                                        { borderColor: colors.icon + '40' },
                                        receiptUri && { borderColor: colors.tint, backgroundColor: colors.tint + '10', borderStyle: 'solid' }
                                    ]}
                                    onPress={() => setCameraVisible(true)}
                                >
                                    {receiptUri ? (
                                        <View style={styles.receiptContent}>
                                            <ExpoImage source={{ uri: receiptUri }} style={styles.receiptPreview} />
                                            <ThemedText style={[styles.receiptTextActive, { color: colors.tint }]}>Receipt Attached</ThemedText>
                                            <IconSymbol name="checkmark.circle.fill" size={22} color={colors.tint} style={{ marginLeft: 'auto' }} />
                                        </View>
                                    ) : (
                                        <View style={styles.receiptContent}>
                                            <View style={[styles.iconCircle, { backgroundColor: '#F0F2F5' }]}>
                                                <IconSymbol name="camera.viewfinder" size={20} color={colors.tint} />
                                            </View>
                                            <ThemedText style={styles.receiptText}>Scan Receipt</ThemedText>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>

            <ReceiptCameraModal
                visible={cameraVisible}
                onClose={() => setCameraVisible(false)}
                onCapture={handleReceiptCaptured}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 50, paddingBottom: 20 },
    closeButton: { padding: 8 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    amountContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 30 },
    currencySymbol: { fontSize: 40, fontWeight: 'bold', color: '#BDBDBD', marginRight: 4, marginTop: 4 },
    amountInput: { fontSize: 64, fontWeight: 'bold', minWidth: 100, textAlign: 'center' },

    sectionLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 10, textTransform: 'uppercase' },
    categoryScroll: { gap: 12, paddingRight: 20 },
    categoryCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: '#eee', gap: 8, height: 50 },
    iconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    categoryText: { fontSize: 14, color: '#444', fontWeight: '500' },

    divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 24 },

    formSection: { gap: 16 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56 },
    textInput: { flex: 1, fontSize: 16, fontFamily: Fonts.regular },

    dayScroll: { gap: 8, paddingRight: 20 },
    dayPill: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: '#eee', backgroundColor: '#fff', alignItems: 'center', minWidth: 80 },
    dayPillText: { fontSize: 15, color: '#333', fontWeight: '600' },
    dayPillDate: { fontSize: 11, marginTop: 2, fontWeight: '500' },

    receiptButton: { borderWidth: 1, borderRadius: 16, padding: 12, borderStyle: 'dashed', marginTop: 10 },
    receiptContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    receiptText: { fontSize: 16, color: '#666', fontWeight: '500' },
    receiptTextActive: { fontSize: 16, fontWeight: '600' },
    receiptPreview: { width: 40, height: 40, borderRadius: 8, borderWidth: 1, borderColor: '#eee' },
});