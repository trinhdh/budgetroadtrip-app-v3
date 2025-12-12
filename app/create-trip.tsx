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
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { ProcessingModal } from '@/components/ui/processing-modal';

import { GeoPoint, ItineraryItem, TripMember, TripPayload, TripVibe } from '@/constants/types';
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
    const [isLoading, setIsLoading] = useState(false);

    // --- WARNING / ERROR STATE ---
    const [warningVisible, setWarningVisible] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const [isCriticalError, setIsCriticalError] = useState(false); // [NEW] Track if it's an error or just a warning

    // We store the partial data here waiting for confirmation
    const [pendingTripData, setPendingTripData] = useState<{
        itinerary: ItineraryItem[],
        estimatedCost: number,
        estimatedBreakdown: any[],
        aiNote?: string, // [NEW] Added AI Note
        image: string
    } | null>(null);

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
    const totalSteps = form.mode === 'manual' ? 3 : 5;

    const isLastStep = (currentStep: number, mode: 'ai' | 'manual') => {
        if (mode === 'manual' && currentStep === 3) return true;
        if (mode === 'ai' && currentStep === 5) return true;
        return false;
    };

    const handleNext = () => {
        // Validation Logic
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
        } else if (form.mode === 'ai' && step === 4) {
            if (!form.mpg || !form.gasPrice) {
                Alert.alert('Incomplete', 'Please select a vehicle or enter MPG/Gas Price.');
                return;
            }
        } else if (form.mode === 'manual' && step === 3) {
            if (form.budget < 200) {
                Alert.alert('Invalid Budget', 'Please set a budget of at least $200.');
                return;
            }
        }

        // Skip steps 3 and 4 in manual mode
        if (form.mode === 'manual' && step === 2) {
            setStep(3);
            return;
        }

        if (isLastStep(step, form.mode)) {
            initiateTripGeneration();
        } else {
            setStep(step + 1);
        }
    };

    // --- PHASE 1: GENERATE / PREPARE PLAN ---
    const initiateTripGeneration = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to create a trip.");
            return;
        }

        if (form.mode === 'ai') setIsLoading(true);

        try {
            let generatedData = {
                itinerary: [] as ItineraryItem[],
                estimatedCost: 0,
                estimatedBreakdown: [] as any[],
                aiNote: undefined as string | undefined, // [NEW]
                warning: undefined as string | undefined
            };
            let coverImage = '';

            // 1. Fetch Image
            try {
                const fetchedImage = await ImageService.getPlaceImage(form.destination);
                if (fetchedImage) coverImage = fetchedImage;
            } catch (ignored) {
                console.log("Could not fetch image, using default");
            }

            if (form.mode === 'manual') {
                // 2a. MANUAL MODE
                const manualItinerary: ItineraryItem[] = Array.from({ length: form.duration }, (_, i) => {
                    const coords = form.destinationCoordinates || { lat: 0, lng: 0 };
                    return {
                        id: Crypto.randomUUID(),
                        order: i,
                        day: i + 1,
                        title: `Day ${i + 1}: ${form.destination}`,
                        description: "Free day to explore.",
                        fuel_cost: 0,
                        drive_time: "0h",
                        start_city: form.destination,
                        end_city: form.destination,
                        coordinates: coords,
                        stopLocation: coords,
                        hotel_options: [],
                        food_options: [],
                        activity_options: [],
                        timeline: []
                    };
                });

                generatedData.itinerary = manualItinerary;
                generatedData.estimatedCost = 0;
                generatedData.estimatedBreakdown = [];

                await finalizeTripCreation({
                    itinerary: generatedData.itinerary,
                    estimatedCost: generatedData.estimatedCost,
                    estimatedBreakdown: generatedData.estimatedBreakdown,
                    image: coverImage,
                    aiNote: undefined
                });

            } else {
                // 2b. AI MODE
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

                // [NEW] CHECK FOR CRITICAL ERROR
                if (aiResult.error) {
                    setIsLoading(false);
                    setWarningMessage(aiResult.error);
                    setIsCriticalError(true); // Mark as critical
                    setWarningVisible(true);
                    return; // Stop execution
                }

                generatedData.itinerary = aiResult.itinerary || [];
                generatedData.estimatedCost = aiResult.estimatedCost || 0;
                generatedData.estimatedBreakdown = aiResult.estimatedBreakdown || [];
                generatedData.aiNote = aiResult.aiNote;
                generatedData.warning = aiResult.warning;

                // 3. Check for Warnings (Non-critical)
                if (generatedData.warning) {
                    setIsLoading(false);
                    setWarningMessage(generatedData.warning);
                    setIsCriticalError(false); // Not critical
                    setPendingTripData({
                        itinerary: generatedData.itinerary,
                        estimatedCost: generatedData.estimatedCost,
                        estimatedBreakdown: generatedData.estimatedBreakdown,
                        aiNote: generatedData.aiNote,
                        image: coverImage
                    });
                    setWarningVisible(true);
                    return; // Wait for user confirmation
                }

                // 4. Proceed if no issues
                await finalizeTripCreation({
                    itinerary: generatedData.itinerary,
                    estimatedCost: generatedData.estimatedCost,
                    estimatedBreakdown: generatedData.estimatedBreakdown,
                    aiNote: generatedData.aiNote,
                    image: coverImage
                });
            }

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Generation Failed", error.message || "Could not create trip plan.");
            console.error("Error adding trip: ", error);
        }
    };

    // --- PHASE 2: SAVE TO DB ---
    const finalizeTripCreation = async (data: {
        itinerary: ItineraryItem[],
        estimatedCost: number,
        estimatedBreakdown: any[],
        aiNote?: string, // [NEW]
        image: string
    }) => {
        if (!user) return;

        if (!isLoading && form.mode === 'ai') setIsLoading(true);

        try {
            let endDateObj = null;
            if (form.startDate) {
                endDateObj = new Date(form.startDate);
                endDateObj.setDate(endDateObj.getDate() + form.duration - 1);
            }

            const ownerMember: TripMember = {
                uid: user.uid,
                name: user.displayName || 'Traveler',
                avatar: user.photoURL || undefined,
                role: 'owner'
            };

            const isManual = form.mode === 'manual';

            const finalTripData: TripPayload = {
                startCity: form.origin,
                endCity: form.destination,
                destination: form.destination,
                startDate: form.startDate ? form.startDate.toISOString() : null,
                endDate: endDateObj ? endDateObj.toISOString() : null,
                duration: form.duration,
                budget: form.budget,
                mode: form.mode,
                vibe: isManual ? null : form.vibe,
                people: isManual ? 1 : (form.adults + form.children),
                estimatedCost: isManual ? 0 : data.estimatedCost,
                estimatedBreakdown: isManual ? [] : data.estimatedBreakdown,

                aiNote: isManual ? undefined : data.aiNote, // [NEW] Save note

                itinerary: data.itinerary,
                image: data.image,
                members: [ownerMember],
                originCoordinates: form.originCoordinates || undefined,

                travelers: isManual ? { adults: 1, children: 0 } : {
                    adults: form.adults,
                    children: form.children
                },
                vehicle: isManual ? { name: '', mpg: 0, gasPrice: 0 } : {
                    name: form.carName || 'Personal Vehicle',
                    mpg: Number(form.mpg) || 0,
                    gasPrice: Number(form.gasPrice) || 0
                }
            };

            const tripId = await TripService.saveTrip(user.uid, finalTripData);

            setIsLoading(false);
            setWarningVisible(false);

            router.replace({
                pathname: '/trip-details/[id]',
                params: { id: tripId }
            });

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Save Error", "Could not save your trip.");
            console.error("Error adding trip: ", error);
        }
    };

    const handleBack = () => {
        if (step === 1) router.back();
        else if (form.mode === 'manual' && step === 3) setStep(2);
        else setStep(step - 1);
    };

    return (
        <ThemedView style={styles.container}>
            <ProcessingModal visible={isLoading} />

            {/* --- WARNING / ERROR MODAL --- */}
            <BottomSheetModal
                isVisible={warningVisible}
                onClose={() => setWarningVisible(false)}
                title={isCriticalError ? "Plan Impossible" : "Trip Feasibility Check"}
                height="auto" // [UPDATED] Auto height
            >
                <View style={{ paddingBottom: 20 }}>
                    <View style={[styles.warningBox, isCriticalError && { backgroundColor: '#FFEBEE' }]}>
                        <IconSymbol
                            name={isCriticalError ? "xmark" : "exclamationmark.triangle.fill"}
                            size={32}
                            color={isCriticalError ? "#D32F2F" : "#FF9500"}
                        />
                        <ThemedText style={[styles.warningTitle, isCriticalError && { color: "#D32F2F" }]}>
                            {isCriticalError ? "Cannot Create Trip" : "Heads Up!"}
                        </ThemedText>
                        <ThemedText style={styles.warningText}>
                            {warningMessage}
                        </ThemedText>
                    </View>

                    <View style={styles.warningActions}>
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: '#f0f0f0' }]}
                            onPress={() => setWarningVisible(false)}
                        >
                            <ThemedText style={{ color: '#333' }}>
                                {isCriticalError ? "Adjust Plan" : "Edit Plan"}
                            </ThemedText>
                        </TouchableOpacity>

                        {/* [UPDATED] Only show Proceed if NOT a critical error */}
                        {!isCriticalError && (
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: colors.tint }]}
                                onPress={() => {
                                    if (pendingTripData) {
                                        finalizeTripCreation(pendingTripData);
                                    }
                                }}
                            >
                                <ThemedText style={styles.buttonText}>Proceed Anyway</ThemedText>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </BottomSheetModal>

            {/* HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={isLoading}>
                    <IconSymbol name="chevron.left" size={24} color={colors.text} />
                    <ThemedText style={{ marginLeft: 5 }}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </ThemedText>
                </TouchableOpacity>
                <ThemedText type="subtitle" style={styles.headerTitle}>
                    {`Step ${step} of ${totalSteps}`}
                </ThemedText>
                <View style={{ width: 80 }} />
            </View>

            {/* FORM STEPS */}
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
                            {form.mode === 'manual' && step === 3 && <StepFive form={{ ...form, mode: 'manual' }} setForm={setForm} />}
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* FOOTER */}
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

    // --- WARNING MODAL STYLES ---
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