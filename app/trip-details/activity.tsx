import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddressSearchModal } from '@/components/ui/address-search-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { Trip } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripService } from '@/services/trip-service';
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

const ACTIVITY_TYPES = [
    { id: 'food', label: 'Food', icon: 'fork.knife', color: '#E71D36' },
    { id: 'hotel', label: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'activities', label: 'Activity', icon: 'camera.fill', color: '#7209B7' },
    { id: 'fuel', label: 'Fuel', icon: 'fuelpump.fill', color: '#FF9F1C' },
    { id: 'other', label: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export default function ActivityScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
    const dayIndex = params.dayIndex ? parseInt(Array.isArray(params.dayIndex) ? params.dayIndex[0] : params.dayIndex, 10) : 0;

    const initialData = params.activity ? JSON.parse(Array.isArray(params.activity) ? params.activity[0] : params.activity) : null;
    const isEditing = !!initialData;

    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [loading, setLoading] = useState(false);
    const [trip, setTrip] = useState<Trip | null>(null);

    const [step, setStep] = useState<'search' | 'details'>(initialData ? 'details' : 'search');
    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [selectedType, setSelectedType] = useState('activities');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        if (!tripId) return;
        const unsubscribe = TripService.subscribeToTrip(tripId, (data) => {
            if (data) setTrip(data);
        });
        return () => unsubscribe();
    }, [tripId]);

    useEffect(() => {
        if (initialData) {
            setName(initialData.title || '');
            setPrice(initialData.price ? String(initialData.price) : '');
            setSelectedType(initialData.type || 'activities');

            setSelectedPlace({
                name: initialData.title,
                address: initialData.address || initialData.desc,
                coordinates: initialData.coordinates,
                // Load existing rich data if editing
                photoRef: initialData.photo_reference,
                rating: initialData.rating,
                user_ratings_total: initialData.user_ratings_total,
                price_level: initialData.price_level,
                types: initialData.types,
                opening_hours: initialData.is_open_now !== undefined ? { open_now: initialData.is_open_now } : undefined
            });
            setStep('details');
        }
    }, []);

    const handleLocationSelect = (data: any, details: any) => {
        const coords = details?.geometry?.location
            ? {
                lat: details.geometry.location.lat,
                lng: details.geometry.location.lng,
            }
            : { lat: 0, lng: 0 };

        const placeName = data.structured_formatting?.main_text || details?.name || data.description?.split(',')[0] || 'New Activity';

        // --- EXTRACT RICH DETAILS ---
        const photoRef = details?.photos?.[0]?.photo_reference;
        const rating = details?.rating;
        const user_ratings_total = details?.user_ratings_total;
        const price_level = details?.price_level;
        const types = details?.types;
        const opening_hours = details?.opening_hours;

        setSelectedPlace({
            name: placeName,
            address: data.description,
            coordinates: coords,
            // Store rich details in state
            photoRef,
            rating,
            user_ratings_total,
            price_level,
            types,
            opening_hours
        });

        setName(placeName);
        setStep('details');
    };

    const handleSave = async () => {
        if (!tripId || !trip || !selectedPlace) return;

        setLoading(true);

        const currentTimeline = trip.itinerary[dayIndex]?.timeline || [];
        let updatedTimeline;

        const newItem = {
            id: initialData?.id || Date.now().toString(),
            title: name || selectedPlace.name,
            desc: selectedPlace.address,
            address: selectedPlace.address,
            type: selectedType,
            price: Number(price) || 0,
            coordinates: selectedPlace.coordinates,
            order: initialData?.order || currentTimeline.length + 1,

            // --- FIXED: Use (value ?? null) to prevent 'undefined' errors ---
            photo_reference: (selectedPlace.photoRef ?? initialData?.photo_reference) ?? null,
            rating: (selectedPlace.rating ?? initialData?.rating) ?? null,
            user_ratings_total: (selectedPlace.user_ratings_total ?? initialData?.user_ratings_total) ?? null,
            price_level: (selectedPlace.price_level ?? initialData?.price_level) ?? null,
            types: (selectedPlace.types ?? initialData?.types) ?? null,

            // Handle opening hours safely
            is_open_now: (selectedPlace.opening_hours?.open_now ?? initialData?.is_open_now) ?? null,
        };

        if (isEditing) {
            updatedTimeline = currentTimeline.map((t: any) =>
                t.id === newItem.id ? { ...t, ...newItem } : t
            );
        } else {
            updatedTimeline = [...currentTimeline, newItem];
        }

        try {
            await TripService.updateDayTimeline(tripId, dayIndex, updatedTimeline);
            router.back();
        } catch (error) {
            console.error(error); // Log the actual error
            Alert.alert("Error", "Failed to save activity.");
        } finally {
            setLoading(false);
        }
    };

    const canSave = step === 'details' && selectedPlace;

    return (
        <ThemedView style={styles.container}>
            {/* HEADER */}
            <View style={styles.headerContainer}>
                <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                    <ThemedText style={{ color: colors.text, opacity: 0.6 }}>Cancel</ThemedText>
                </TouchableOpacity>

                <ThemedText type="title" style={styles.headerTitle}>
                    {step === 'search' ? "Search Place" : (isEditing ? "Edit Activity" : "New Activity")}
                </ThemedText>

                <View style={styles.headerRight}>
                    {step === 'details' && (
                        <TouchableOpacity
                            onPress={handleSave}
                            disabled={loading || !canSave}
                        >
                            {loading ? (
                                <ActivityIndicator size="small" color={colors.tint} />
                            ) : (
                                <ThemedText style={{ color: colors.tint, fontWeight: 'bold' }}>
                                    Save
                                </ThemedText>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                {step === 'search' ? (
                    <View style={{ flex: 1, paddingHorizontal: 20 }}>
                        <AddressSearchModal
                            onSelect={handleLocationSelect}
                            placeholder="Where are you going?"
                        />
                    </View>
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <ScrollView
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Back to Search */}
                            <TouchableOpacity onPress={() => setStep('search')} style={styles.backLink}>
                                <IconSymbol name="chevron.left" size={20} color={colors.tint} />
                                <ThemedText style={{ color: colors.tint, marginLeft: 4 }}>Change Location</ThemedText>
                            </TouchableOpacity>

                            {/* Place Preview */}
                            <View style={styles.previewCard}>
                                <View style={[styles.iconCircle, { backgroundColor: colors.tint + '15' }]}>
                                    <IconSymbol name="mappin.and.ellipse" size={24} color={colors.tint} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={{ fontSize: 16, fontWeight: '600' }}>
                                        {selectedPlace?.name || name}
                                    </ThemedText>
                                    <ThemedText style={{ fontSize: 12, color: '#808080', marginTop: 2 }}>
                                        {selectedPlace?.address}
                                    </ThemedText>
                                </View>
                            </View>

                            {/* Activity Name */}
                            <ThemedText style={styles.label}>Activity Name</ThemedText>
                            <View style={[styles.inputContainer, { marginBottom: 24 }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="e.g. Lunch at Joe's"
                                    placeholderTextColor="#999"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            {/* Cost */}
                            <ThemedText style={styles.label}>Cost (Optional)</ThemedText>
                            <View style={styles.inputContainer}>
                                <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: '#BDBDBD' }}>$</ThemedText>
                                <TextInput
                                    style={[styles.input, { color: colors.text }]}
                                    placeholder="0.00"
                                    placeholderTextColor="#999"
                                    keyboardType="decimal-pad"
                                    value={price}
                                    onChangeText={setPrice}
                                />
                            </View>

                            {/* Category */}
                            <ThemedText style={[styles.label, { marginTop: 24 }]}>Category</ThemedText>
                            <View style={styles.typeRow}>
                                {ACTIVITY_TYPES.map((type) => (
                                    <TouchableOpacity
                                        key={type.id}
                                        style={[
                                            styles.typeButton,
                                            selectedType === type.id && { backgroundColor: type.color, borderColor: type.color }
                                        ]}
                                        onPress={() => setSelectedType(type.id)}
                                    >
                                        <IconSymbol
                                            name={type.icon as any}
                                            size={20}
                                            color={selectedType === type.id ? '#fff' : type.color}
                                        />
                                        <ThemedText
                                            style={[
                                                styles.typeText,
                                                selectedType === type.id && { color: '#fff', fontWeight: 'bold' }
                                            ]}
                                        >
                                            {type.label}
                                        </ThemedText>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },

    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerButton: { padding: 4, minWidth: 60 },
    headerRight: { minWidth: 60, alignItems: 'flex-end' },
    headerTitle: { fontWeight: '700', fontSize: 18 },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

    backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 5 },

    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: '#FAFAFA',
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    label: {
        fontSize: 13,
        fontWeight: '700',
        color: '#999',
        marginBottom: 8,
        letterSpacing: 0.5
    },

    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    typeButton: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '30%',
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 16,
        gap: 8,
        backgroundColor: '#FAFAFA'
    },
    typeText: { fontSize: 11, color: '#666' },

    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: '#fff'
    },
    input: { flex: 1, fontSize: 18, marginLeft: 8, fontWeight: '500' },
});