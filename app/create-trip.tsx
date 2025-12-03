import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView, // 1. Import ScrollView
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

import StepFour from '@/components/create-trip/step-four';
import StepOne from '@/components/create-trip/step-one';
import StepThree from '@/components/create-trip/step-three';
import StepTwo from '@/components/create-trip/step-two';

export default function CreateTripScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    const [step, setStep] = useState(1);
    const totalSteps = 4;

    const [form, setForm] = useState({
        origin: '',
        destination: '',
        startDate: null,
        duration: '5',
        isRoundTrip: false,
        adults: 1,
        children: 0,
        carName: '',
        mpg: '',
        gasPrice: '3.50',
    });

    const handleNext = () => {
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
            if (!form.carName || !form.mpg || !form.gasPrice) {
                Alert.alert('Incomplete', 'Please fill in all vehicle details.');
                return;
            }
        }

        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            console.log('Trip Created:', form);
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
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                    <IconSymbol name="chevron.left" size={24} color={colors.text} />
                    <ThemedText style={{ marginLeft: 5 }}>{step === 1 ? 'Cancel' : 'Back'}</ThemedText>
                </TouchableOpacity>
                <ThemedText type="subtitle" style={styles.headerTitle}>
                    Step {step} of {totalSteps}
                </ThemedText>
                <View style={{ width: 80 }} />
            </View>

            {/* 2. Wrap content in KeyboardAvoidingView AND ScrollView */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0} // Adjusts for header height
            >
                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled" // Ensures buttons work when keyboard is open
                    showsVerticalScrollIndicator={false}
                >
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <View>
                            {step === 1 && <StepOne form={form} setForm={setForm} />}
                            {step === 2 && <StepTwo form={form} setForm={setForm} />}
                            {step === 3 && <StepThree form={form} setForm={setForm} />}
                            {step === 4 && <StepFour form={form} setForm={setForm} />}
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
        paddingBottom: 100, // Extra padding at bottom for scrolling past keyboard
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: StyleSheet.hairlineWidth,
        backgroundColor: 'transparent', // Ensure it doesn't block background
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