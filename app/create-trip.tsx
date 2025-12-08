import { useHeaderHeight } from '@react-navigation/elements';
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

import { TripVibe } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { AiPlannerService } from '@/services/ai-planner';
import { ImageService } from '@/services/image-service';
import { TripService } from '@/services/trip-service';

// Define coordinate type locally
type Coords = { latitude: number; longitude: number } | null;

export default function CreateTripScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const headerHeight = useHeaderHeight();

    const [step, setStep] = useState(1);
    const totalSteps = 5;
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({
        origin: '',
        originCoordinates: null as Coords,
        destination: '',
        destinationCoordinates: null as Coords,
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
        if (mode === 'manual' && currentStep === 2) return true; // Manual ends at Step 2 (Dates)
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
            // Step 4 validation is only needed for AI mode
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
            let aiPlan: any;
            let coverImage: string | null = null;

            // 1. FETCH IMAGE (Try to get a cover image)
            try {
                coverImage = await ImageService.getPlaceImage(form.destination);
            } catch (ignored) {
                console.log("Could not fetch image, using default");
            }

            // 2. GENERATE PLAN
            if (form.mode === 'manual') {
                // --- MANUAL MODE: Create Skeleton ---
                // We generate empty days based on the Duration from Step 2
                const manualItinerary = Array.from({ length: form.duration }, (_, i) => ({
                    day: i + 1,
                    title: `Day ${i + 1}: ${form.destination}`,
                    distance: '0 mi',
                    stopLocation: form.destinationCoordinates || form.originCoordinates || { latitude: 0, longitude: 0 },
                    timeline: [],
                }));

                aiPlan = {
                    tripName: `${form.destination} Trip`,
                    estimatedCost: 0,
                    originCoordinates: form.originCoordinates,
                    budgetBreakdown: [],
                    itinerary: manualItinerary,
                };
            } else {
                // --- AI MODE: Call Service ---
                aiPlan = await AiPlannerService.generateTripPlan({
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
            }

            // 3. SAVE TO FIREBASE
            const proceedWithSave = async () => {
                try {
                    let endDateObj = null;
                    if (form.startDate) {
                        endDateObj = new Date(form.startDate);
                        endDateObj.setDate(endDateObj.getDate() + form.duration);
                    }

                    const finalTripData = {
                        origin: form.origin,
                        originCoordinates: form.originCoordinates || aiPlan.originCoordinates,
                        destination: form.destination,
                        destinationCoordinates: form.destinationCoordinates || undefined,
                        startDate: form.startDate ? form.startDate.toISOString() : null,
                        endDate: endDateObj ? endDateObj.toISOString() : null,
                        duration: form.duration,
                        isRoundTrip: form.isRoundTrip,

                        // Use form values (or defaults if skipped)
                        travelers: { adults: form.adults, children: form.children },
                        vehicle: {
                            name: form.carName || 'Unknown Vehicle',
                            mpg: Number(form.mpg) || 0,
                            gasPrice: Number(form.gasPrice) || 0
                        },
                        budget: form.budget,
                        vibe: form.vibe,

                        title: aiPlan.tripName,
                        estimatedCost: aiPlan.estimatedCost,
                        budgetBreakdown: aiPlan.budgetBreakdown,
                        itinerary: aiPlan.itinerary,
                        image: coverImage || undefined,
                        spent: 0,
                    };

                    const tripId = await TripService.saveTrip(user.uid, finalTripData);

                    setIsLoading(false);
                    router.replace({
                        pathname: '/trip-details/[id]',
                        params: { id: tripId }
                    });
                } catch (error) {
                    setIsLoading(false);
                    Alert.alert("Error", "Failed to save the trip.");
                    console.error(error);
                }
            };

            if (form.mode === 'ai' && (!aiPlan.itinerary || aiPlan.itinerary.length === 0)) {
                setIsLoading(false);
                Alert.alert("Unable to Plan Trip", aiPlan.warning || "Error generating plan.", [{ text: "OK" }]);
                return;
            }

            if (aiPlan.warning && form.mode === 'ai') {
                setIsLoading(false);
                Alert.alert(
                    "Trip Planner Note",
                    aiPlan.warning + "\n\nDo you still want to proceed?",
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Proceed", onPress: () => { setIsLoading(true); proceedWithSave(); } }
                    ]
                );
                return;
            }

            await proceedWithSave();

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Generation Failed", "Could not create trip plan.");
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