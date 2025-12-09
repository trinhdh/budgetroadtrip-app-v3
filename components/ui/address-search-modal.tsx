import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

type Props = {
    onSelect: (data: any, details: any) => void;
    onClose?: () => void; // Optional now
    placeholder?: string;
};

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_API_KEY;

export function AddressSearchModal({ onSelect, onClose, placeholder }: Props) {
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];

    return (
        <View style={styles.container}>
            {/* Header only if onClose is provided (optional) */}
            {onClose && (
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <IconSymbol name="chevron.left" size={28} color={colors.text} />
                        <ThemedText>Back</ThemedText>
                    </TouchableOpacity>
                </View>
            )}

            <View style={styles.body}>
                <GooglePlacesAutocomplete
                    placeholder={placeholder || 'Search for a place...'}
                    fetchDetails={true}
                    onPress={onSelect}
                    textInputProps={{
                        autoFocus: true,
                        placeholderTextColor: '#808080',
                        clearButtonMode: 'always',
                    }}
                    query={{
                        key: GOOGLE_PLACES_API_KEY,
                        language: 'en',
                    }}
                    styles={{
                        textInputContainer: { backgroundColor: 'transparent' },
                        textInput: {
                            height: 50,
                            fontSize: 16,
                            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
                            color: colors.text,
                            borderRadius: 12,
                            paddingHorizontal: 15,
                            fontFamily: Fonts.regular,
                        },
                        listView: { marginTop: 10 },
                        row: { backgroundColor: 'transparent', paddingVertical: 15 },
                        description: { color: colors.text, fontFamily: Fonts.regular },
                        separator: { backgroundColor: colors.icon, height: 0.5 },
                    }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    closeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    body: {
        flex: 1,
        paddingHorizontal: 16,
    },
});