import { ThemedText } from '@/components/themed-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import {
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
// Import the updated Search View
import { AddressSearchModal } from './address-search-modal';

type Props = {
    visible: boolean;
    onClose: () => void;
    initialData?: any; // <--- ADDED: To support editing
    onSave: (item: any, createExpense: boolean) => void;
};

const ACTIVITY_TYPES = [
    { id: 'food', label: 'Food', icon: 'fork.knife', color: '#E71D36' },
    { id: 'hotel', label: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'activities', label: 'Activity', icon: 'camera.fill', color: '#7209B7' },
    { id: 'fuel', label: 'Fuel', icon: 'fuelpump.fill', color: '#FF9F1C' },
    { id: 'other', label: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export function AddActivityModal({ visible, onClose, initialData, onSave }: Props) {
    const [step, setStep] = useState<'search' | 'details'>('search');
    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [selectedType, setSelectedType] = useState('activities');
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    // Handle Reset (Add Mode) vs Pre-fill (Edit Mode)
    useEffect(() => {
        if (visible) {
            if (initialData) {
                // --- EDIT MODE ---
                setName(initialData.title || '');
                setPrice(initialData.price ? String(initialData.price) : '');
                setSelectedType(initialData.type || 'activities');

                // reconstruct place object so we can go back/forth or save
                setSelectedPlace({
                    name: initialData.title,
                    address: initialData.address || initialData.desc,
                    coordinates: initialData.coordinates,
                });

                // Skip search, go straight to details
                setStep('details');
            } else {
                // --- ADD MODE (Reset) ---
                // Small timeout to prevent UI flicker while modal opens
                const timer = setTimeout(() => {
                    setStep('search');
                    setSelectedPlace(null);
                    setPrice('');
                    setName('');
                    setSelectedType('activities');
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, [visible, initialData]);

    const handleLocationSelect = (data: any, details: any) => {
        const coords = details?.geometry?.location
            ? {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
            }
            : { latitude: 0, longitude: 0 };

        const placeName = data.structured_formatting?.main_text || details?.name || data.description?.split(',')[0] || 'New Activity';

        setSelectedPlace({
            name: placeName,
            address: data.description,
            coordinates: coords,
        });

        setName(placeName);
        setStep('details');
    };

    const handleSave = () => {
        if (!selectedPlace) return;

        const newItem = {
            // Keep ID if editing so parent knows what to update
            ...(initialData?.id && { id: initialData.id }),

            title: name || selectedPlace.name,
            desc: selectedPlace.address,
            address: selectedPlace.address,
            type: selectedType,
            price: Number(price) || 0,
            coordinates: selectedPlace.coordinates,
            // Keep original order if editing, else new timestamp
            order: initialData?.order || Date.now(),
        };

        onSave(newItem, false);
        onClose();
    };

    const isEditing = !!initialData;

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title={step === 'search' ? "Search Place" : (isEditing ? "Edit Activity" : "Trip Activity")}
            height="90%"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {step === 'search' ? (
                    <AddressSearchModal
                        onSelect={handleLocationSelect}
                        placeholder="Where are you going?"
                    />
                ) : (
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1 }}>
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                <TouchableOpacity onPress={() => setStep('search')} style={styles.backLink}>
                                    <IconSymbol name="chevron.left" size={20} color={Colors.light.tint} />
                                    <ThemedText style={{ color: Colors.light.tint }}>Change Location</ThemedText>
                                </TouchableOpacity>

                                {/* Place Preview */}
                                <View style={styles.previewCard}>
                                    <View style={[styles.iconCircle, { backgroundColor: Colors.light.tint + '15' }]}>
                                        <IconSymbol name="mappin.and.ellipse" size={24} color={Colors.light.tint} />
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

                                {/* Activity Name Input */}
                                <ThemedText style={styles.label}>Activity Name</ThemedText>
                                <View style={[styles.inputContainer, { marginBottom: 24 }]}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Lunch at Joe's"
                                        placeholderTextColor="#E0E0E0"
                                        value={name}
                                        onChangeText={setName}
                                    />
                                </View>

                                {/* Cost */}
                                <ThemedText style={styles.label}>Display Cost (Optional)</ThemedText>
                                <View style={styles.inputContainer}>
                                    <ThemedText style={{ fontSize: 20, fontWeight: 'bold', color: '#BDBDBD' }}>$</ThemedText>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0.00"
                                        placeholderTextColor="#E0E0E0"
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

                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <ThemedText style={styles.saveButtonText}>
                                        {isEditing ? "Update Activity" : "Add to Itinerary"}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </KeyboardAvoidingView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 100
    },
    backLink: {
        flexDirection: 'row', alignItems: 'center', marginBottom: 15, marginTop: 5
    },
    previewCard: {
        flexDirection: 'row', alignItems: 'center', gap: 16,
        backgroundColor: '#FAFAFA', padding: 12, borderRadius: 12, marginBottom: 24,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    iconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

    label: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    typeButton: {
        alignItems: 'center', justifyContent: 'center',
        width: '30%',
        paddingVertical: 12,
        borderWidth: 1, borderColor: '#eee', borderRadius: 16,
        gap: 8, backgroundColor: '#FAFAFA'
    },
    typeText: { fontSize: 11, color: '#666' },

    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16,
        paddingHorizontal: 16, height: 56, backgroundColor: '#fff'
    },
    input: { flex: 1, fontSize: 18, marginLeft: 8, fontWeight: '500', color: '#333' },

    footer: {
        position: 'absolute', bottom: 20, left: 20, right: 20,
    },
    saveButton: {
        backgroundColor: Colors.light.tint, height: 56, borderRadius: 28,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: Colors.light.tint, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5
    },
    saveButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' }
});