import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
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

// Import step components
import StepOne from '@/components/create-trip/step-one';
import StepThree from '@/components/create-trip/step-three'; // 1. Import Step 3
import StepTwo from '@/components/create-trip/step-two';

export default function CreateTripScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [step, setStep] = useState(1);
    const totalSteps = 4; // Increased total steps (assuming Budget is Step 4)

    const [form, setForm] = useState({
        // Step 1
        origin: '',
        destination: '',
        // Step 2
        startDate: null,
        duration: '5', // Default 5 days
        isRoundTrip: false, // Default one-way
        // Step 3 (New Fields)
        adults: 1,
        children: 0,
        // Step 4
        budget: '',
    });

    const handleNext = () => {
        // 1. Validation Logic
        if (step === 1) {
            if (!form.origin || !form.destination) {
                Alert.alert('Incomplete', 'Please fill in both origin and destination.');
                return;
            }
        } else if (step === 2) {
            if (!form.startDate || !form.duration) {
                Alert.alert('Incomplete', 'Please fill in all date details.');
                return;
            }
        }
        // Step 3 validation is usually not needed if we set defaults (1 adult)
        // but you can add specific checks here if required.

        // 2. Navigation Logic
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            // 3. Final Submission
            console.log('Trip Created:', form);
            // TODO: Save to Firebase here
            router.back();
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

                    <View style={{ width: 80 }} />
                </View>

                {/* Content Area */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.content}
                >
                    {step === 1 && <StepOne form={form} setForm={setForm} />}
                    {step === 2 && <StepTwo form={form} setForm={setForm} />}
                    {step === 3 && <StepThree form={form} setForm={setForm} />}

                    {step > 3 && (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <ThemedText>Step 4: Budget (Coming Soon)</ThemedText>
                        </View>
                    )}
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
        </TouchableWithoutFeedback>
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
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 30,
    },
    footer: {
        padding: 24,
        borderTopWidth: StyleSheet.hairlineWidth,
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