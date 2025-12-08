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
import { AddActivityModal } from '@/components/ui/add-activity-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { GeoPoint, Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RouteService } from '@/services/route-service';
import { TripService } from '@/services/trip-service';

const { height } = Dimensions.get('window');

const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'food': return 'fork.knife';
        case 'hotel': return 'bed.double.fill';
        case 'activities': return 'camera.fill';
        case 'fuel': return 'fuelpump.fill';
        default: return 'mappin.circle.fill';
    }
};

export default function DayDetailsScreen() {
    const router = useRouter();
    const { user } = useAuth();
    const params = useLocalSearchParams();
    const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
    const dayIndex = params.dayIndex ? parseInt(Array.isArray(params.dayIndex) ? params.dayIndex[0] : params.dayIndex, 10) : 0;

    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [addModalVisible, setAddModalVisible] = useState(false);

    // Route State
    const [dayRouteCoordinates, setDayRouteCoordinates] = useState<GeoPoint[]>([]);

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

    // --- CALCULATE ROUTE FOR THIS DAY ---
    useEffect(() => {
        const fetchDayRoute = async () => {
            if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return;

            const currentDay = trip.itinerary[dayIndex];
            const timeline = currentDay.timeline || [];

            // 1. Determine START Point
            let startPoint: GeoPoint;
            if (dayIndex === 0) {
                startPoint = trip.originCoordinates || { latitude: 0, longitude: 0 };
            } else {
                startPoint = trip.itinerary[dayIndex - 1].stopLocation;
            }

            // 2. Determine END Point & Waypoints
            if (timeline.length === 0) {
                setDayRouteCoordinates([]);
                return;
            }

            const stops = timeline.map(t => t.coordinates);
            const destination = stops[stops.length - 1];
            const waypoints = stops.slice(0, -1);

            const path = await RouteService.getRoute(startPoint, destination, waypoints);
            if (path) {
                setDayRouteCoordinates(path);
            }
        };

        fetchDayRoute();
    }, [trip, dayIndex]);

    const handleAddActivity = async (newItem: any, createExpense: boolean) => {
        if (!tripId || !user) return;

        try {
            // 1. Add Activity to Timeline
            await TripService.addActivityToDay(tripId, dayIndex, newItem);

            // 2. (Optional) Add to Expenses
            if (createExpense && newItem.price > 0) {
                const expenseItem = {
                    title: newItem.title,
                    amount: newItem.price,
                    category: capitalize(newItem.type),
                    day: dayIndex + 1, // Store as 1-based index
                    date: new Date().toISOString(),
                    addedBy: {
                        uid: user.uid,
                        name: user.displayName || 'Traveler',
                        avatar: user.photoURL || ''
                    },
                    createdAt: new Date(),
                };
                await TripService.addExpense(tripId, expenseItem);
            }

        } catch (error) {
            Alert.alert("Error", "Failed to add activity.");
        }
    };

    const capitalize = (s: string) => s && s[0].toUpperCase() + s.slice(1);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return null;

    const currentDay = trip.itinerary[dayIndex];
    const timeline = currentDay.timeline || [];

    // Determine Map Start Point for Marker
    const startPoint = dayIndex === 0
        ? trip.originCoordinates
        : trip.itinerary[dayIndex - 1].stopLocation;

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* --- MAP --- */}
            <View style={styles.mapContainer}>
                <MapView
                    style={StyleSheet.absoluteFill}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={{
                        latitude: startPoint?.latitude || 37.78825,
                        longitude: startPoint?.longitude || -122.4324,
                        latitudeDelta: 0.5,
                        longitudeDelta: 0.5,
                    }}
                >
                    {/* START MARKER */}
                    {startPoint && (
                        <Marker coordinate={startPoint} title="Start of Day" zIndex={10}>
                            <View style={[styles.markerBadge, { backgroundColor: '#333' }]}>
                                <IconSymbol name="play.fill" size={10} color="#fff" />
                            </View>
                        </Marker>
                    )}

                    {/* ACTIVITY MARKERS */}
                    {timeline.map((item, idx) => (
                        <Marker
                            key={idx}
                            coordinate={item.coordinates}
                            title={item.title}
                            description={item.desc}
                            zIndex={5}
                        >
                            <View style={[styles.markerBadge, { backgroundColor: colors.tint }]}>
                                <ThemedText style={styles.markerText}>{idx + 1}</ThemedText>
                            </View>
                        </Marker>
                    ))}

                    {/* ROUTE */}
                    {dayRouteCoordinates.length > 0 && (
                        <Polyline
                            coordinates={dayRouteCoordinates}
                            strokeColor={colors.tint}
                            strokeWidth={4}
                        />
                    )}
                </MapView>

                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={[styles.gradientHeader, { height: insets.top + 60 }]}
                />
                <TouchableOpacity
                    style={[styles.backButton, { top: insets.top + 10 }]}
                    onPress={() => router.back()}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <ThemedText style={styles.headerDayLabel}>Day {currentDay.day}</ThemedText>
                    <ThemedText type="subtitle" style={{ color: '#fff' }}>{currentDay.title}</ThemedText>
                </View>
            </View>

            {/* --- TIMELINE LIST --- */}
            <ScrollView
                style={styles.contentContainer}
                contentContainerStyle={{ paddingBottom: 100, paddingHorizontal: 20, paddingTop: 20 }}
            >
                {timeline.map((item, index) => (
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timeColumn}>
                            <ThemedText style={styles.timeText}>{index + 1}</ThemedText>
                            {index < timeline.length - 1 && (
                                <View style={[styles.timeLine, { backgroundColor: colors.icon + '40' }]} />
                            )}
                        </View>

                        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                            <View style={styles.cardHeader}>
                                <View style={[styles.iconBox, { backgroundColor: colors.tint + '15' }]}>
                                    <IconSymbol name={getCategoryIcon(item.type) as any} size={20} color={colors.tint} />
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
                        </View>
                    </View>
                ))}

                {/* Empty State */}
                {timeline.length === 0 && (
                    <View style={styles.emptyState}>
                        <IconSymbol name="map.fill" size={40} color="#DDD" />
                        <ThemedText style={{ color: '#808080', textAlign: 'center', marginTop: 10 }}>
                            No activities yet. Tap the button below to add your first stop!
                        </ThemedText>
                    </View>
                )}

                {/* --- ADD ACTIVITY BUTTON (Replaced FAB) --- */}
                <TouchableOpacity
                    onPress={() => setAddModalVisible(true)}
                    style={[
                        styles.addItemButton,
                        { borderColor: colors.icon + '40', marginTop: 24 }
                    ]}
                >
                    <IconSymbol name="plus" size={20} color={colors.text} />
                    <ThemedText style={styles.addItemText}>Add Activity</ThemedText>
                </TouchableOpacity>

            </ScrollView>

            <AddActivityModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleAddActivity}
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    mapContainer: { height: height * 0.35, width: '100%', position: 'relative' },
    gradientHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
    backButton: {
        position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center'
    },
    headerTitleContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
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
    descText: { fontSize: 14, color: '#444', lineHeight: 20 },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', opacity: 0.8 },

    // NEW BUTTON STYLE (Matches Main Screen)
    addItemButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed',
        backgroundColor: 'transparent'
    },
    addItemText: { fontSize: 16, fontFamily: Fonts.medium, color: '#666' },
});