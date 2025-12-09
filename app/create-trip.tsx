import { useHeaderHeight } from '@react-navigation/elements';
import * as Crypto from 'expo-crypto'; // Need this for manual ID generation
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
import { ProcessingModal } from '@/components/ui/processing-modal';

// --- NEW IMPORTS ---
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

    // Form State matches UI needs, will be mapped to 'Trip' type on save
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

    // Helper to determine if we are on the last step for the current mode
    const isLastStep = (currentStep: number, mode: string) => {
        if (mode === 'manual' && currentStep === 2) return true; // Manual ends at Step 2
        if (currentStep === totalSteps) return true; // AI ends at Step 5
        return false;
    };

    const handleNext = () => {
        // --- VALIDATION ---
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

        // --- NAVIGATION LOGIC ---
        if (isLastStep(step, form.mode)) {
            handleGenerateTrip();
        } else {
            setStep(step + 1);
        }
    };

    const handleGenerateTrip = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to create a trip.");
            return;
        }

        setIsLoading(true);

        try {
            let partialTripData: Partial<Trip> = {};
            let coverImage: string = '';

            // 1. FETCH IMAGE (Try to get a cover image)
            try {
                const fetchedImage = await ImageService.getPlaceImage(form.destination);
                if (fetchedImage) coverImage = fetchedImage;
            } catch (ignored) {
                console.log("Could not fetch image, using default");
            }

            // 2. GENERATE PLAN (Manual or AI)
            if (form.mode === 'manual') {
                // --- MANUAL MODE: Create Skeleton ---
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
                    // Empty options arrays
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
                // --- AI MODE: Call Service ---
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

                // Handle AI Warnings
                if (aiResult.warning) {
                    // Note: In a real app, you might want to show a confirmation dialog here
                    // For now, we attach the warning but proceed unless the itinerary is empty
                    if (!aiResult.itinerary || aiResult.itinerary.length === 0) {
                        throw new Error(aiResult.warning);
                    }
                    Alert.alert("Trip Planner Note", aiResult.warning);
                }

                partialTripData = aiResult;
            }

            // 3. CONSTRUCT FINAL TRIP OBJECT
            const saveTripToDb = async () => {
                let endDateObj = null;
                if (form.startDate) {
                    endDateObj = new Date(form.startDate);
                    endDateObj.setDate(endDateObj.getDate() + form.duration);
                }

                // Create the Owner Member
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

                    // Merged Data from AI/Manual generation
                    estimatedCost: partialTripData.estimatedCost || 0,
                    estimatedBreakdown: partialTripData.estimatedBreakdown || [],
                    itinerary: partialTripData.itinerary || [],

                    image: coverImage,
                    members: [ownerMember],
                    createdAt: new Date(), // Service will likely convert this to serverTimestamp
                };

                // 4. SAVE TO FIREBASE
                const tripId = await TripService.saveTrip(user.uid, finalTripData);

                setIsLoading(false);

                // Replace ensures the user can't "back" into the form
                router.replace({
                    pathname: '/trip-details/[id]',
                    params: { id: tripId }
                });
            };

            await saveTripToDb();

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Generation Failed", error.message || "Could not create trip plan.");
            console.error(error);
        }
    };

    const handleBack = () => {
        if (step === 1) {
            router.back();
        } else {
            setStep(step - 1);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ProcessingModal visible={isLoading} />

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

                            {/* Only show these if AI Mode */}
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
    }
});