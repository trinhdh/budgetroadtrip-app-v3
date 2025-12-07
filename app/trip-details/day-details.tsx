import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { Trip } from '@/constants/types';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TripService } from '@/services/trip-service';

const { height } = Dimensions.get('window');

// Helper to get icon for timeline category
const getCategoryIcon = (type: string) => {
    switch (type) {
        case 'food': return 'fork.knife';
        case 'hotel': return 'bed.double.fill';
        case 'activities': return 'camera.fill';
        case 'fuel': return 'fuelpump.fill';
        default: return 'mappin.circle.fill';
    }
};

export default function DayDetailsScreen() {
    const router = useRouter();
    // 1. Correctly retrieve params sent from the previous screen
    const params = useLocalSearchParams();
    const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
    const dayIndex = params.dayIndex ? parseInt(Array.isArray(params.dayIndex) ? params.dayIndex[0] : params.dayIndex, 10) : 0;

    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) return;
        const unsubscribe = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) {
                setTrip(data);
            } else {
                Alert.alert("Error", "Trip not found");
                router.back();
            }
        });
        return () => unsubscribe();
    }, [tripId]);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) {
        return (
            <View style={styles.container}>
                <ThemedText>Day details not found.</ThemedText>
            </View>
        );
    }

    // 2. Select the specific day data
    const currentDay = trip.itinerary[dayIndex];
    const timeline = currentDay.timeline || [];

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* --- Header Map (Focused on this day) --- */}
            <View style={styles.mapContainer}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                        latitude: currentDay.stopLocation?.latitude || 37.78825,
                        longitude: currentDay.stopLocation?.longitude || -122.4324,
                        latitudeDelta: 0.5, // Zoomed in closer for day view
                        longitudeDelta: 0.5,
                    }}
                >
                    {/* Markers for each timeline item */}
                    {timeline.map((item, idx) => (
                        <Marker
                            key={idx}
                            coordinate={item.coordinates}
                            title={item.title}
                            description={item.desc}
                        >
                            <View style={[styles.markerBadge, { backgroundColor: colors.tint }]}>
                                <ThemedText style={styles.markerText}>{idx + 1}</ThemedText>
                            </View>
                        </Marker>
                    ))}

                    {/* Connect points with a line */}
                    {timeline.length > 1 && (
                        <Polyline
                            coordinates={timeline.map(t => t.coordinates)}
                            strokeColor={colors.tint}
                            strokeWidth={3}
                        />
                    )}
                </MapView>

                {/* Gradient Overlay for Text Visibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={[styles.gradientHeader, { height: insets.top + 60 }]}
                />

                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + 10 }]}
                    onPress={() => router.back()}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Day Title Overlay */}
                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerDayLabel}>Day {currentDay.day}</ThemedText>
                    <ThemedText type="subtitle" style={{ color: '#fff' }}>{currentDay.title}</ThemedText>
                </View>
            </View>

            {/* --- Timeline Content --- */}
            <ScrollView
                style={styles.contentContainer}
                contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20, paddingTop: 20 }}
            >
                {timeline.map((item, index) => (
                    <View key={index} style={styles.timelineItem}>
                        {/* Time/Order Column */}
                        <View style={styles.timeColumn}>
                            <ThemedText style={styles.timeText}>{index + 1}</ThemedText>
                            {index < timeline.length - 1 && (
                                <View style={[styles.timeLine, { backgroundColor: colors.icon + '40' }]} />
                            )}
                        </View>

                        {/* Content Card */}
                        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
                                    <IconSymbol
                                        name={getCategoryIcon(item.type) as any}
                                        size={20}
                                        color={colors.tint}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                                    <ThemedText style={styles.categoryLabel}>{item.type}</ThemedText>
                                </View>
                                {item.price > 0 && (
                                    <ThemedText style={styles.priceText}>${item.price}</ThemedText>
                                )}
                            </View>

                            <ThemedText style={styles.descText}>{item.desc}</ThemedText>

                            <View style={styles.addressRow}>
                                <IconSymbol name="mappin.circle.fill" size={14} color="#808080" />
                                <ThemedText style={styles.addressText} numberOfLines={1}>
                                    {item.address}
                                </ThemedText>
                            </View>
                        </View>
                    </View>
                ))}

                {timeline.length === 0 && (
                    <View style={styles.emptyState}>
                        <ThemedText style={{ color: '#808080', textAlign: 'center' }}>
                            No activities planned for this day yet.
                        </ThemedText>
                    </View>
                )}
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapContainer: { height: height * 0.35, width: '100%', position: 'relative' },
    gradientHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
    backButton: {
        position: 'absolute', left: 20,
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center'
    },
    headerTitleContainer: {
        position: 'absolute', bottom: 20, left: 20, right: 20
    },
    headerDayLabel: {
        color: '#fff', fontSize: 12, fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 4
    },
    markerBadge: {
        width: 24, height: 24, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff'
    },
    markerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    contentContainer: { flex: 1 },

    // Timeline Styles
    timelineItem: { flexDirection: 'row', marginBottom: 20 },
    timeColumn: { alignItems: 'center', marginRight: 16, width: 30 },
    timeText: { fontSize: 16, fontFamily: Fonts.bold, color: '#808080' },
    timeLine: { width: 2, flex: 1, marginTop: 4, borderRadius: 1 },

    card: {
        flex: 1, padding: 16, borderRadius: 16, borderWidth: 1,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 4, elevation: 2
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    categoryLabel: { fontSize: 12, color: '#808080', textTransform: 'capitalize' },
    priceText: { fontSize: 16, fontFamily: Fonts.bold, color: '#333' },
    descText: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12 },
    addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    addressText: { fontSize: 12, color: '#808080', flex: 1 },

    emptyState: { padding: 40, alignItems: 'center' }
});