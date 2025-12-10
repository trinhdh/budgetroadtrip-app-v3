import { ThemedText } from '@/components/themed-text';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Colors } from '@/constants/theme';
import React, { useEffect, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';

type Props = {
    visible: boolean;
    onClose: () => void;
    initialNotes?: string;
    onSave: (notes: string) => void;
};

export function NotesModal({ visible, onClose, initialNotes, onSave }: Props) {
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (visible) {
            setNotes(initialNotes || '');
        }
    }, [visible, initialNotes]);

    const handleSave = () => {
        onSave(notes);
        onClose();
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title="Trip Notes"
            height="60%"
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <View style={{ flex: 1, paddingHorizontal: 20, paddingBottom: 20 }}>
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder="Write packing lists, reminders, or reservation codes here..."
                                placeholderTextColor="#999"
                                multiline
                                textAlignVertical="top"
                                value={notes}
                                onChangeText={setNotes}
                                autoFocus={false}
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <ThemedText style={styles.saveButtonText}>Save Notes</ThemedText>
                        </TouchableOpacity>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
    },
    saveButton: {
        backgroundColor: Colors.light.tint,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.light.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
        marginBottom: 20
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
    },
});