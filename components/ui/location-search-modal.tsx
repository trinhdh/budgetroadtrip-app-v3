import React from 'react';
// 1. Remove SafeAreaView from 'react-native'
import { Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
// 2. Import it from 'react-native-safe-area-context' instead
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
    visible: boolean;
    onClose: () => void;
    onSelect: (data: any, details: any) => void;
    placeholder?: string;
};

// REPLACE WITH YOUR ACTUAL API KEY
const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

export function LocationSearchModal({ visible, onClose, onSelect, placeholder }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header with Close Button */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <IconSymbol name="chevron.left" size={28} color={colors.text} />
                        <ThemedText>Cancel</ThemedText>
                    </TouchableOpacity>
                    <ThemedText type="subtitle">Search Location</ThemedText>
                    <View style={{ width: 80 }} />
                </View>

                <View style={styles.body}>
                    <GooglePlacesAutocomplete
                        placeholder={placeholder || 'Search...'}
                        fetchDetails={true}
                        onPress={(data, details = null) => {
                            // 'details' is provided when fetchDetails = true
                            onSelect(data, details);
                            onClose();
                        }}
                        // Add this prop to auto-focus the input
                        textInputProps={{
                            autoFocus: true,
                            placeholderTextColor: '#808080',
                            clearButtonMode: 'always',
                        }}
                        query={{
                            key: GOOGLE_PLACES_API_KEY,
                            language: 'en',
                            types: '(cities)', // Restrict to cities if you want
                        }}
                        styles={{
                            textInputContainer: {
                                backgroundColor: 'transparent',
                            },
                            textInput: {
                                height: 50,
                                fontSize: 16,
                                backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                                color: colors.text,
                                borderRadius: 12,
                                paddingHorizontal: 15,
                                fontFamily: Fonts.regular,
                            },
                            listView: {
                                marginTop: 10,
                            },
                            row: {
                                backgroundColor: 'transparent',
                                paddingVertical: 15,
                            },
                            description: {
                                color: colors.text,
                                fontFamily: Fonts.regular,
                            },
                            separator: {
                                backgroundColor: colors.icon,
                                height: 0.5,
                            },
                        }}
                    />
                </View>
            </SafeAreaView>
        </Modal>
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
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    closeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 10,
    },
});