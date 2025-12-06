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

// --- NEW IMPORTS ---
import { useAuth } from '@/context/AuthContext';
import { AiPlannerService } from '@/services/ai-planner';
import { TripService } from '@/services/trip-service';

export default function CreateTripScreen() {
    const router = useRouter();
    const { user } = useAuth(); // Get current user
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const headerHeight = useHeaderHeight();

    const [step, setStep] = useState(1);
    const totalSteps = 5;
    const [isLoading, setIsLoading] = useState(false);

    const [form, setForm] = useState({
        origin: '',
        destination: '',
        startDate: null as Date | null,
        duration: 5,
        isRoundTrip: false,
        adults: 1,
        children: 0,
        carName: '',
        mpg: '',
        gasPrice: '3.20',
        budget: 1000,
    });

    const handleNext = () => {
        // --- Validation Logic ---
        if (step === 1) {
            if (!form.origin || !form.destination) {
                Alert.alert('Incomplete', 'Please select both origin and destination.');
                return;
            }
        } else if (step === 2) {
            if (!form.startDate || !form.duration) {
                Alert.alert('Incomplete', 'Please fill in all date details.');
                return;
            }
        } else if (step === 4) {
            if (!form.mpg || !form.gasPrice) {
                Alert.alert('Incomplete', 'Please select a vehicle or enter MPG.');
                return;
            }
        }

        // --- Navigation Logic ---
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            // Trigger AI Generation
            handleGenerateTrip();
        }
    };

    const handleGenerateTrip = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to create a trip.");
            return;
        }

        setIsLoading(true);

        try {
            // 1. Generate Plan via AI
            const aiPlan = await AiPlannerService.generateTripPlan({
                origin: form.origin,
                destination: form.destination,
                duration: form.duration,
                budget: form.budget,
                travelers: { adults: form.adults, children: form.children },
                carName: form.carName
            });

            // 2. Combine Form Data + AI Data
            const finalTripData = {
                // User Inputs
                origin: form.origin,
                destination: form.destination,
                startDate: form.startDate ? form.startDate.toISOString() : null,
                duration: form.duration,
                travelers: { adults: form.adults, children: form.children },
                vehicle: { name: form.carName, mpg: form.mpg, gasPrice: form.gasPrice },
                totalBudget: form.budget,

                // AI Outputs (Spread them to merge)
                title: aiPlan.tripName,
                estimatedCost: aiPlan.estimatedCost,
                budgetBreakdown: aiPlan.budgetBreakdown,
                itinerary: aiPlan.itinerary,

                // Defaults
                spent: 0,
            };

            // 3. Save to Firestore
            const tripId = await TripService.saveTrip(user.uid, finalTripData);

            // 4. Success & Navigate
            setIsLoading(false);

            // Navigate to the newly created trip details page
            router.replace({
                pathname: '/trip-details/[id]',
                params: { id: tripId }
            });

        } catch (error: any) {
            setIsLoading(false);
            Alert.alert("Generation Failed", "Could not create trip plan. Please try again.");
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

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton} disabled={isLoading}>
                    <IconSymbol name="chevron.left" size={24} color={colors.text} />
                    <ThemedText style={{ marginLeft: 5 }}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </ThemedText>
                </TouchableOpacity>

                <ThemedText type="subtitle" style={styles.headerTitle}>
                    Step {step} of {totalSteps}
                </ThemedText>

                <View style={{ width: 80 }} />
            </View>

            {/* Content Area */}
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
                            {step === 3 && <StepThree form={form} setForm={setForm} />}
                            {step === 4 && <StepFour form={form} setForm={setForm} />}
                            {step === 5 && <StepFive form={form} setForm={setForm} />}
                        </View>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Footer */}
            <View style={[styles.footer, { borderTopColor: colors.icon }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: colors.tint }]}
                    onPress={handleNext}
                    disabled={isLoading}
                >
                    <ThemedText style={styles.buttonText}>
                        {step === totalSteps ? 'Create Trip' : 'Next'}
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingBottom: 10,
    },
    headerTitle: {
        fontSize: 16,
        fontFamily: Fonts.medium,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 30,
        paddingBottom: 100,
    },
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
    buttonText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 18,
    },
});