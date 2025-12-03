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

// Import all step components
import StepFive from '@/components/create-trip/step-five';
import StepFour from '@/components/create-trip/step-four';
import StepOne from '@/components/create-trip/step-one';
import StepThree from '@/components/create-trip/step-three';
import StepTwo from '@/components/create-trip/step-two';

export default function CreateTripScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [step, setStep] = useState(1);
    const totalSteps = 5; // Updated to 5

    const [form, setForm] = useState({
        // Step 1: Location
        origin: '',
        destination: '',
        // Step 2: Dates
        startDate: null,
        duration: '5',
        isRoundTrip: false,
        // Step 3: People
        adults: 1,
        children: 0,
        // Step 4: Vehicle
        carName: '',
        mpg: '',
        gasPrice: '3.20', // Default National Avg
        // Step 5: Budget
        budget: 1000,
        budgetType: 'manual' as 'auto' | 'manual',
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
        } else if (step === 3) {
            // Defaults are usually fine for Step 3
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
            // --- Final Submission ---
            console.log('Final Trip Data:', form);
            // TODO: Save to Firebase here
            router.back();
        }
    };

    const handleBack = () => {
        if (step === 1) {
            router.back(); // Close modal if on first step
        } else {
            setStep(step - 1);
        }
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol
                        name="chevron.left"
                        size={24}
                        color={colors.text}
                    />
                    <ThemedText style={{ marginLeft: 5 }}>
                        {step === 1 ? 'Cancel' : 'Back'}
                    </ThemedText>
                </TouchableOpacity>

                <ThemedText type="subtitle" style={styles.headerTitle}>
                    Step {step} of {totalSteps}
                </ThemedText>

                {/* Spacer to keep title centered */}
                <View style={{ width: 80 }} />
            </View>

            {/* Content Area with Keyboard Fix */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 180 : 0} // Increased offset
            >
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
        paddingBottom: 100, // Extra padding for scrolling past keyboard
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