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
    Switch,
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
    onSave: (item: any, createExpense: boolean) => void;
};

const ACTIVITY_TYPES = [
    { id: 'food', label: 'Food', icon: 'fork.knife', color: '#E71D36' },
    { id: 'hotel', label: 'Hotel', icon: 'bed.double.fill', color: '#2EC4B6' },
    { id: 'activities', label: 'Activity', icon: 'camera.fill', color: '#7209B7' },
    { id: 'fuel', label: 'Fuel', icon: 'fuelpump.fill', color: '#FF9F1C' },
    { id: 'other', label: 'Other', icon: 'circle.grid.2x2.fill', color: '#808080' },
];

export function AddActivityModal({ visible, onClose, onSave }: Props) {
    const [step, setStep] = useState<'search' | 'details'>('search');
    const [selectedPlace, setSelectedPlace] = useState<any>(null);
    const [selectedType, setSelectedType] = useState('activities');
    const [price, setPrice] = useState('');
    const [addToBudget, setAddToBudget] = useState(true);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (!visible) {
            // Small delay to reset after animation out
            const timer = setTimeout(() => {
                setStep('search');
                setSelectedPlace(null);
                setPrice('');
                setAddToBudget(true);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [visible]);

    const handleLocationSelect = (data: any, details: any) => {
        const coords = details?.geometry?.location
            ? {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
            }
            : { latitude: 0, longitude: 0 };

        setSelectedPlace({
            name: data.description || details?.name,
            address: data.description,
            coordinates: coords,
        });

        // Switch content immediately within the same modal
        setStep('details');
    };

    const handleSave = () => {
        if (!selectedPlace) return;

        const newItem = {
            title: selectedPlace.name.split(',')[0],
            desc: selectedPlace.address,
            address: selectedPlace.address,
            type: selectedType,
            price: Number(price) || 0,
            coordinates: selectedPlace.coordinates,
            order: Date.now(),
        };

        onSave(newItem, addToBudget && newItem.price > 0);
        onClose();
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title={step === 'search' ? "Search Place" : "Trip Activity"}
            height="90%"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {step === 'search' ? (
                    // --- STEP 1: SEARCH ---
                    <AddressSearchModal
                        onSelect={handleLocationSelect}
                        placeholder="Where are you going?"
                    />
                ) : (
                    // --- STEP 2: DETAILS ---
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View style={{ flex: 1 }}>
                            <ScrollView
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {/* Back Button inside Details */}
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
                                        <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 16 }}>
                                            {selectedPlace?.name.split(',')[0]}
                                        </ThemedText>
                                        <ThemedText style={{ fontSize: 12, color: '#808080', marginTop: 2 }} numberOfLines={1}>
                                            {selectedPlace?.address}
                                        </ThemedText>
                                    </View>
                                </View>

                                {/* Category */}
                                <ThemedText style={styles.label}>Category</ThemedText>
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

                                {/* Cost */}
                                <ThemedText style={styles.label}>Cost (Optional)</ThemedText>
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

                                {/* Budget Toggle */}
                                <View style={styles.toggleRow}>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText style={styles.toggleLabel}>Add to Expenses</ThemedText>
                                        <ThemedText style={styles.toggleSubLabel}>Automatically add this cost to your budget</ThemedText>
                                    </View>
                                    <Switch
                                        value={addToBudget}
                                        onValueChange={setAddToBudget}
                                        trackColor={{ false: '#767577', true: Colors.light.tint }}
                                        thumbColor={'#f4f3f4'}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.footer}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                                    <ThemedText style={styles.saveButtonText}>Add to Itinerary</ThemedText>
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
        backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 24,
        borderWidth: 1, borderColor: '#F0F0F0',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2
    },
    iconCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },

    label: { fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

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
        paddingHorizontal: 16, height: 56, marginBottom: 24, backgroundColor: '#FAFAFA'
    },
    input: { flex: 1, fontSize: 20, marginLeft: 8, fontWeight: 'bold', color: '#333' },

    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    toggleLabel: { fontSize: 16, fontWeight: '600', color: '#333' },
    toggleSubLabel: { fontSize: 12, color: '#888', marginTop: 2 },

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