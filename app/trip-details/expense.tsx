import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { storage } from '@/firebaseConfig';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripService } from '@/services/trip-service';
import { Image as ExpoImage } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
    { id: 'food', label: 'Food', icon: 'fork.knife', color: '#E71D36' },
    { id: 'hotel', label: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'activities', label: 'Activity', icon: 'camera.fill', color: '#7209B7' },
    { id: 'fuel', label: 'Fuel', icon: 'fuelpump.fill', color: '#FF9F1C' },
    { id: 'other', label: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export default function ExpenseScreen() {
    const router = useRouter();
    const { tripId, expense } = useLocalSearchParams();
    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const initialData = expense ? JSON.parse(Array.isArray(expense) ? expense[0] : expense) : null;

    // 1. IMPROVED LOGIC: Check for ID to determine if it's truly editing
    const isEditing = !!initialData?.id;
    // 2. CHECK: If it's a new expense but 'day' is passed, it means we are in Day Details view
    const isDayFixed = !isEditing && !!initialData?.day;

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loadingTrip, setLoadingTrip] = useState(true);

    const [amount, setAmount] = useState('');
    const [title, setTitle] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('food');
    const [selectedDay, setSelectedDay] = useState(1);
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!tripId) return;
        const id = Array.isArray(tripId) ? tripId[0] : tripId;

        const unsubscribe = TripService.subscribeToTrip(id, (data) => {
            setTrip(data);
            setLoadingTrip(false);
        });

        return () => unsubscribe();
    }, [tripId]);

    useEffect(() => {
        if (initialData) {
            setAmount(initialData.amount ? String(initialData.amount) : '');
            setTitle(initialData.title || '');
            const cat = initialData.category ? initialData.category.toLowerCase() : 'food';
            setSelectedCategory(CATEGORIES.some(c => c.id === cat) ? cat : 'food');
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

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera access is required to scan receipts.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.5,
            base64: false,
        });

        if (!result.canceled && result.assets[0].uri) {
            setReceiptUri(result.assets[0].uri);
        }
    };

    const uploadReceipt = async (uri: string) => {
        if (!tripId) return null;
        try {
            const response = await fetch(uri);
            const blob = await response.blob();
            const filename = `receipts/${Array.isArray(tripId) ? tripId[0] : tripId}/${Date.now()}.jpg`;
            const storageRef = ref(storage, filename);
            await uploadBytes(storageRef, blob);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Upload failed", error);
            throw error;
        }
    };

    const handleSave = async () => {
        if (!user || !tripId) return;
        const numericAmount = parseFloat(amount);

        if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
            Alert.alert("Invalid Amount", "Please enter an amount greater than 0.");
            return;
        }

        setSaving(true);

        try {
            let finalReceiptUrl = receiptUri;
            if (receiptUri && (receiptUri.startsWith('file://') || receiptUri.startsWith('content://'))) {
                finalReceiptUrl = await uploadReceipt(receiptUri);
            }

            const tId = Array.isArray(tripId) ? tripId[0] : tripId;

            const expenseData = {
                amount: numericAmount,
                title: title || 'Expense',
                category: selectedCategory,
                day: selectedDay,
                receiptImage: finalReceiptUrl,
                date: getFormattedDate(selectedDay) || `Day ${selectedDay}`,
                addedBy: initialData?.addedBy || {
                    uid: user.uid,
                    name: user.displayName || 'User',
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`
                },
                createdAt: initialData?.createdAt ? new Date(initialData.createdAt) : new Date(),
                hasReceipt: !!finalReceiptUrl
            };

            if (isEditing && initialData.id) {
                await TripService.updateExpense(tId, initialData.id, expenseData);
            } else {
                await TripService.addExpense(tId, expenseData);
            }
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to upload receipt or save expense.");
        } finally {
            setSaving(false);
        }
    };

    if (loadingTrip) {
        return (
            <ThemedView style={styles.centered}>
                <ActivityIndicator size="large" color={colors.tint} />
            </ThemedView>
        );
    }

    const isValid = parseFloat(amount) > 0;

    return (
        <ThemedView style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <ThemedText style={{ color: colors.text, opacity: 0.6 }}>Cancel</ThemedText>
                </TouchableOpacity>

                <ThemedText type="title" style={styles.headerTitle}>
                    {isEditing ? 'Edit Expense' : 'New Expense'}
                </ThemedText>

                <TouchableOpacity onPress={handleSave} disabled={!isValid || saving}>
                    {saving ? (
                        <ActivityIndicator color={colors.tint} />
                    ) : (
                        <ThemedText
                            style={{
                                color: isValid ? colors.tint : '#ccc',
                                fontWeight: 'bold'
                            }}>
                            Save
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </View>

            {/* BODY */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>

                            {/* AMOUNT */}
                            <View style={styles.amountWrapper}>
                                <TextInput
                                    style={styles.amountInput}
                                    placeholder="0.00"
                                    placeholderTextColor="#D8D8D8"
                                    keyboardType="decimal-pad"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>

                            {/* CATEGORY */}
                            <ThemedText style={styles.sectionLabel}>Category</ThemedText>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.categoryScroll}
                            >
                                {CATEGORIES.map(cat => {
                                    const selected = selectedCategory === cat.id;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            onPress={() => setSelectedCategory(cat.id)}
                                            style={[
                                                styles.categoryChip,
                                                { borderColor: selected ? cat.color : '#E5E5E5' },
                                                selected && { backgroundColor: cat.color }
                                            ]}
                                        >
                                            <IconSymbol
                                                name={cat.icon as any}
                                                size={18}
                                                color={selected ? '#fff' : cat.color}
                                            />
                                            <ThemedText
                                                style={[
                                                    styles.categoryLabel,
                                                    selected && { color: '#fff', fontWeight: '600' }
                                                ]}
                                            >
                                                {cat.label}
                                            </ThemedText>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>

                            {/* DESCRIPTION */}
                            <View style={styles.inputRow}>
                                <IconSymbol name="pencil" size={18} color="#999" style={{ marginRight: 12 }} />
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Description (e.g. Starbucks)"
                                    placeholderTextColor="#999"
                                    value={title}
                                    onChangeText={setTitle}
                                />
                            </View>

                            {/* DAY SELECTOR - Hidden if day is fixed (New Expense from Day Details) */}
                            {!isDayFixed && (
                                <>
                                    <ThemedText style={[styles.sectionLabel, { marginTop: 28 }]}>
                                        Assign to Day
                                    </ThemedText>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.dayScroll}
                                    >
                                        {trip?.itinerary?.map(day => {
                                            const selected = selectedDay === day.day;
                                            const dateStr = getFormattedDate(day.day);
                                            return (
                                                <TouchableOpacity
                                                    key={day.day}
                                                    onPress={() => setSelectedDay(day.day)}
                                                    style={[
                                                        styles.dayChip,
                                                        selected && { backgroundColor: colors.tint, borderColor: colors.tint }
                                                    ]}
                                                >
                                                    <ThemedText style={[styles.dayChipText, selected && { color: '#fff' }]}>
                                                        Day {day.day}
                                                    </ThemedText>

                                                    {dateStr && (
                                                        <ThemedText
                                                            style={[
                                                                styles.dayChipDate,
                                                                selected ? { color: 'rgba(255,255,255,0.8)' } : { color: '#888' }
                                                            ]}
                                                        >
                                                            {dateStr}
                                                        </ThemedText>
                                                    )}
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                </>
                            )}

                            {/* RECEIPT */}
                            <TouchableOpacity
                                style={[
                                    styles.receiptBox,
                                    receiptUri && {
                                        backgroundColor: colors.tint + '10',
                                        borderColor: colors.tint
                                    }
                                ]}
                                onPress={takePhoto}
                            >
                                {receiptUri ? (
                                    <View style={styles.receiptRow}>
                                        <ExpoImage source={{ uri: receiptUri }} style={styles.receiptPreview} />
                                        <ThemedText
                                            style={{
                                                fontWeight: '600',
                                                color: colors.tint,
                                                marginLeft: 10
                                            }}
                                        >
                                            Receipt Attached
                                        </ThemedText>
                                        <IconSymbol
                                            name="checkmark.circle.fill"
                                            size={20}
                                            color={colors.tint}
                                            style={{ marginLeft: 'auto' }}
                                        />
                                    </View>
                                ) : (
                                    <View style={styles.receiptRow}>
                                        <View style={styles.receiptIconBox}>
                                            <IconSymbol name="camera.viewfinder" size={20} color={colors.tint} />
                                        </View>
                                        <ThemedText style={styles.receiptLabel}>Scan Receipt</ThemedText>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 14 : 40,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerButton: { padding: 4 },
    headerTitle: { fontWeight: '700', fontSize: 18 },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    amountWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'flex-end',
        marginTop: 24,
        marginBottom: 30,
    },
    amountInput: {
        fontSize: 54,
        fontWeight: '700',
        textAlign: 'center',
        minWidth: 120
    },

    sectionLabel: {
        fontSize: 13,
        fontWeight: '700',
        opacity: 0.7,
        marginBottom: 10
    },

    categoryScroll: { gap: 10, paddingRight: 16 },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    categoryLabel: { fontSize: 14, color: '#444' },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E5E5',
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 50,
        marginTop: 16,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        fontFamily: Fonts.regular
    },

    dayScroll: { gap: 10, paddingRight: 16, marginBottom: 6 },
    dayChip: {
        borderWidth: 1,
        borderColor: '#E5E5E5',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 14,
        minWidth: 80,
        alignItems: 'center'
    },
    dayChipText: { fontSize: 15, fontWeight: '600' },
    dayChipDate: { fontSize: 11, marginTop: 2 },

    receiptBox: {
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#CCC',
        padding: 14,
        borderRadius: 16,
        marginTop: 28
    },
    receiptRow: { flexDirection: 'row', alignItems: 'center' },
    receiptIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#F2F2F2',
        justifyContent: 'center',
        alignItems: 'center'
    },
    receiptLabel: { marginLeft: 12, fontSize: 16, fontWeight: '500' },
    receiptPreview: {
        width: 50,
        height: 50,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#DDD'
    }
});