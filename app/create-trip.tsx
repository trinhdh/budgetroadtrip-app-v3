import { useHeaderHeight } from '@react-navigation/elements';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import StepFive from '@/components/create-trip/step-five';
import StepFour from '@/components/create-trip/step-four';
import StepOne from '@/components/create-trip/step-one';
import StepThree from '@/components/create-trip/step-three';
import StepTwo from '@/components/create-trip/step-two';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal'; // <--- IMPORT THIS
import { ProcessingModal } from '@/components/ui/processing-modal';

import { GeoPoint, ItineraryItem, Trip, TripMember, TripVibe } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { AiPlannerService } from '@/services/ai-planner';
import { ImageService } from '@/services/image-service';
import { TripService } from '@/services/trip-service';

export default function CreateTripScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const headerHeight = useHeaderHeight();

    const [step, setStep] = useState(1);
    const totalSteps = 5;
    const [isLoading, setIsLoading] = useState(false);

    // --- WARNING STATE ---
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [pendingTripData, setPendingTripData] = useState<{ data: Partial<Trip>, image: string } | null>(null);

    const [form, setForm] = useState({
        origin: '',
        originCoordinates: null as GeoPoint | null,
        destination: '',
        destinationCoordinates: null as GeoPoint | null,
        mode: 'ai' as 'ai' | 'manual',
        startDate: null as Date | null,
        duration: 5,
        isRoundTrip: false,
        adults: 1,
        children: 0,
        carName: '',
        mpg: '',
        gasPrice: '2.90',
        budget: 500,
        vibe: 'balanced' as TripVibe,
    });

    const isLastStep = (currentStep: number, mode: string) => {
        if (mode === 'manual' && currentStep === 2) return true;
        if (currentStep === totalSteps) return true;
        return false;
    };

    const handleNext = () => {
        // ... (Keep existing validation logic from Step 1, 2, 4) ...
        if (step === 1) {
            if (!form.origin || !form.destination) {
                Alert.alert('Incomplete', 'Please select both origin and destination.');
                return;
            }
            if (form.origin.trim().toLowerCase() === form.destination.trim().toLowerCase()) {
                Alert.alert('Invalid Route', 'Origin and Destination cannot be the same city.');
                return;
            }
        } else if (step === 2) {
            if (!form.startDate || !form.duration) {
                Alert.alert('Incomplete', 'Please fill in all date details.');
                return;
            }
        } else if (step === 4 && form.mode === 'ai') {
            if (!form.mpg || !form.gasPrice) {
                Alert.alert('Incomplete', 'Please select a vehicle or enter MPG/Gas Price.');
                return;
            }
        }

        if (isLastStep(step, form.mode)) {
            initiateTripGeneration(); // <--- CALL NEW FUNCTION
        } else {
            setStep(step + 1);
        }
    };

    // --- PHASE 1: GENERATE PLAN ---
    const initiateTripGeneration = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to create a trip.");
            return;
        }

        setIsLoading(true);

        try {
            let partialTripData: Partial<Trip> = {};
            let coverImage: string = '';

            // Fetch Image
            try {
                const fetchedImage = await ImageService.getPlaceImage(form.destination);
                if (fetchedImage) coverImage = fetchedImage;
            } catch (ignored) {
                console.log("Could not fetch image, using default");
            }

            if (form.mode === 'manual') {
                const manualItinerary: ItineraryItem[] = Array.from({ length: form.duration }, (_, i) => ({
                    id: Crypto.randomUUID(),
                    order: i,
                    day: i + 1,
                    title: `Day ${i + 1}: ${form.destination}`,
                    description: "Free day to explore.",
                    fuel_cost: 0,
                    drive_time: "0h",
                    start_city: form.destination,
                    end_city: form.destination,
                    coordinates: form.destinationCoordinates || { lat: 0, lng: 0 },
                    hotel_options: [],
                    food_options: [],
                    activity_options: [],
                }));

                partialTripData = {
                    estimatedCost: 0,
                    estimatedBreakdown: [],
                    itinerary: manualItinerary,
                };
            } else {
                const aiResult = await AiPlannerService.generateTripPlan({
                    origin: form.origin,
                    destination: form.destination,
                    duration: form.duration,
                    budget: form.budget,
                    travelers: { adults: form.adults, children: form.children },
                    carName: form.carName,
                    mpg: form.mpg,
                    gasPrice: form.gasPrice,
                    vibe: form.vibe,
                    isRoundTrip: form.isRoundTrip
                });

                partialTripData = aiResult;

                // --- CHECK FOR WARNINGS ---
                if (aiResult.warning) {
                    setIsLoading(false); // Stop spinner
                    setWarningMessage(aiResult.warning);
                    setPendingTripData({ data: partialTripData, image: coverImage });
                    setWarningVisible(true); // SHOW MODAL
                    return; // STOP HERE
                }
            }

            // If no warning, proceed directly
            await finalizeTripCreation(partialTripData, coverImage);

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Generation Failed", error.message || "Could not create trip plan.");
        }
    };

    // --- PHASE 2: SAVE TO DB ---
    const finalizeTripCreation = async (partialData: Partial<Trip>, image: string) => {
        if (!user) return;

        // If we are coming from the modal, ensure we show loading again
        if (!isLoading) setIsLoading(true);

        try {
            let endDateObj = null;
            if (form.startDate) {
                endDateObj = new Date(form.startDate);
                endDateObj.setDate(endDateObj.getDate() + form.duration);
            }

            const ownerMember: TripMember = {
                uid: user.uid,
                name: user.displayName || 'Traveler',
                avatar: user.photoURL || undefined,
                role: 'owner'
            };

            const finalTripData: Trip = {
                userId: user.uid,
                startCity: form.origin,
                endCity: form.destination,
                destination: form.destination,
                startDate: form.startDate ? form.startDate.toISOString() : null,
                endDate: endDateObj ? endDateObj.toISOString() : null,
                duration: form.duration,
                people: form.adults + form.children,
                budget: form.budget,
                vibe: form.vibe,
                estimatedCost: partialData.estimatedCost || 0,
                estimatedBreakdown: partialData.estimatedBreakdown || [],
                itinerary: partialData.itinerary || [],
                image: image,
                members: [ownerMember],
                createdAt: new Date(),
            };

            const tripId = await TripService.saveTrip(user.uid, finalTripData);

            setIsLoading(false);
            setWarningVisible(false); // Close modal if open

            router.replace({
                pathname: '/trip-details/[id]',
                params: { id: tripId }
            });

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Save Error", "Could not save your trip.");
        }
    };

    const handleBack = () => {
        if (step === 1) router.back();
        else setStep(step - 1);
    };

    return (
        <ThemedView style={styles.container}>
            <ProcessingModal visible={isLoading} />

            {/* --- WARNING MODAL --- */}
            <BottomSheetModal
                isVisible={warningVisible}
                onClose={() => setWarningVisible(false)}
                title="Trip Feasibility Check"
                height="45%"
            >
                <View style={{ padding: 20, flex: 1 }}>
                    <View style={styles.warningBox}>
                        <IconSymbol name="exclamationmark.triangle.fill" size={32} color="#FF9500" />
                        <ThemedText style={styles.warningTitle}>Heads Up!</ThemedText>
                        <ThemedText style={styles.warningText}>
                            {warningMessage}
                        </ThemedText>
                    </View>

                    <View style={styles.warningActions}>
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#f0f0f0' }]}
                            onPress={() => setWarningVisible(false)}
                        >
                            <ThemedText style={{ color: '#333' }}>Edit Plan</ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: colors.tint }]}
                            onPress={() => {
                                if (pendingTripData) {
                                    finalizeTripCreation(pendingTripData.data, pendingTripData.image);
                                }
                            }}
                        >
                            <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Proceed Anyway</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </BottomSheetModal>

            {/* ... (Existing Header, KeyboardAvoidingView, ScrollView code remains same) ... */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={isLoading}>
                    <IconSymbol name="chevron.left" size={24} color={colors.text} />
                    <ThemedText style={{ marginLeft: 5 }}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </ThemedText>
                </TouchableOpacity>
                <ThemedText type="subtitle" style={styles.headerTitle}>
                    {form.mode === 'manual' && step > 2 ? 'Finishing...' : `Step ${step} of ${form.mode === 'manual' ? 2 : totalSteps}`}
                </ThemedText>
                <View style={{ width: 80 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={headerHeight + 20}>
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>
                            {step === 1 && <StepOne form={form} setForm={setForm} />}
                            {step === 2 && <StepTwo form={form} setForm={setForm} />}
                            {form.mode === 'ai' && step === 3 && <StepThree form={form} setForm={setForm} />}
                            {form.mode === 'ai' && step === 4 && <StepFour form={form} setForm={setForm} />}
                            {form.mode === 'ai' && step === 5 && <StepFive form={form} setForm={setForm} />}
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>

            <View style={[styles.footer, { borderTopColor: colors.icon }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.tint }]}
                    onPress={handleNext}
                    disabled={isLoading}
                >
                    {isLastStep(step, form.mode) ? (
                        <View style={styles.aiButtonContent}>
                            <IconSymbol
                                name={form.mode === 'ai' ? "wand.and.stars" : "checkmark.circle.fill"}
                                size={24}
                                color="#fff"
                            />
                            <ThemedText style={styles.buttonText}>
                                {form.mode === 'ai' ? 'Generate Plan' : 'Create Trip'}
                            </ThemedText>
                        </View>
                    ) : (
                        <ThemedText style={styles.buttonText}>Next</ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    // ... (Keep existing styles) ...
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingBottom: 10,
    },
    headerTitle: { fontSize: 16, fontFamily: Fonts.medium },
    backButton: { flexDirection: 'row', alignItems: 'center', width: 80 },
    content: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 100 },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent',
    },
    button: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 18 },
    aiButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    // --- NEW WARNING MODAL STYLES ---
    warningBox: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 10,
        padding: 20,
        backgroundColor: '#FFF8E1', // Light yellow background
        borderRadius: 16,
        gap: 10
    },
    warningTitle: {
        fontSize: 20,
        fontFamily: Fonts.bold,
        color: '#FF9500',
    },
    warningText: {
        textAlign: 'center',
        color: '#555',
        fontSize: 16,
        lineHeight: 24
    },
    warningActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    }
});