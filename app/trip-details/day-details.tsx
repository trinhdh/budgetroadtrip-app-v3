import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddActivityModal } from '@/components/ui/add-activity-modal';
// Assuming AddExpenseModal is imported
import { AddExpenseModal } from '@/components/ui/add-expense-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { GeoPoint, TimelineItem, Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RouteService } from '@/services/route-service';
import { TripService } from '@/services/trip-service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- TYPESCRIPT FIX: Extend the type locally ---
interface ExtendedTimelineItem extends TimelineItem {
    id?: string;
}

// --- SHEET CONFIGURATION ---
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 100;

const getCategoryIcon = (type: string) => {
    switch (type.toLowerCase()) {
        case 'food': return 'fork.knife';
        case 'hotel': return 'bed.double.fill';
        case 'activities': return 'camera.fill';
        case 'fuel': return 'fuelpump.fill';
        // ICON FIX: Use 'banknote' if available, or map 'attach-money' in your IconSymbol file
        case 'expense': return 'banknote';
        case 'other': return 'circle.grid.2x2.fill';
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
    const mapRef = useRef<MapView>(null);

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    // --- MODAL STATES ---
    const [addActivityVisible, setAddActivityVisible] = useState(false);
    const [addExpenseVisible, setAddExpenseVisible] = useState(false);

    // --- ANIMATION VALUES ---
    const [dayRouteCoordinates, setDayRouteCoordinates] = useState<GeoPoint[]>([]);
    const translateY = useSharedValue(-SCREEN_HEIGHT * 0.55);
    const context = useSharedValue({ y: 0 });

    const fabOpen = useSharedValue(0);

    // --- GESTURE FOR SHEET ---
    const gesture = Gesture.Pan()
        .onStart(() => { context.value = { y: translateY.value }; })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y;
            translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
        })
        .onEnd(() => {
            if (translateY.value > -SCREEN_HEIGHT * 0.3) {
                translateY.value = withSpring(-SCREEN_HEIGHT * 0.15, { damping: 15 });
            } else if (translateY.value < -SCREEN_HEIGHT * 0.7) {
                translateY.value = withSpring(MAX_TRANSLATE_Y, { damping: 15 });
            } else {
                translateY.value = withSpring(-SCREEN_HEIGHT * 0.55, { damping: 15 });
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    // --- FAB ANIMATIONS ---
    const toggleFab = () => {
        fabOpen.value = withTiming(fabOpen.value === 0 ? 1 : 0, { duration: 200 });
    };

    const rMainFabStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${interpolate(fabOpen.value, [0, 1], [0, 45])}deg` }]
    }));

    const rAction1Style = useAnimatedStyle(() => ({
        opacity: fabOpen.value,
        transform: [
            { scale: fabOpen.value },
            { translateY: interpolate(fabOpen.value, [0, 1], [0, -70]) }
        ]
    }));

    const rAction2Style = useAnimatedStyle(() => ({
        opacity: fabOpen.value,
        transform: [
            { scale: fabOpen.value },
            { translateY: interpolate(fabOpen.value, [0, 1], [0, -140]) }
        ]
    }));

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribe = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) setTrip(data);
            else { Alert.alert("Error", "Trip not found"); router.back(); }
        });
        return () => unsubscribe();
    }, [tripId]);

    // --- ROUTE & MAP LOGIC ---
    useEffect(() => {
        const fetchDayRoute = async () => {
            if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return;

            const currentDay = trip.itinerary[dayIndex];
            const timeline = (currentDay.timeline || []).sort((a, b) => a.order - b.order);

            let startPoint: GeoPoint;
            if (dayIndex === 0) startPoint = trip.originCoordinates || { latitude: 0, longitude: 0 };
            else startPoint = trip.itinerary[dayIndex - 1].stopLocation;

            // TS FIX: Ensure we only map items with valid coordinates
            const mapItems = timeline.filter(t => t.coordinates && t.coordinates.latitude);

            if (mapRef.current && mapItems.length > 0) {
                const allCoords = [startPoint, ...mapItems.map(t => t.coordinates)];
                mapRef.current.fitToCoordinates(allCoords, {
                    edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                    animated: true,
                });
            }

            if (mapItems.length === 0) {
                setDayRouteCoordinates([]);
                return;
            }

            const stops = mapItems.map(t => t.coordinates);
            const destination = stops[stops.length - 1];
            const waypoints = stops.slice(0, -1);

            if (stops.length > 0) {
                const path = await RouteService.getRoute(startPoint, destination, waypoints);
                if (path) setDayRouteCoordinates(path);
            }
        };
        fetchDayRoute();
    }, [trip, dayIndex]);

    const handleAddActivity = async (newItem: any, createExpense: boolean) => {
        if (!tripId || !user) return;
        try {
            const currentTimeline = trip?.itinerary[dayIndex].timeline || [];
            const itemWithMeta = { ...newItem, id: Date.now().toString(), order: currentTimeline.length + 1 };
            await TripService.addActivityToDay(tripId, dayIndex, itemWithMeta);
            if (createExpense && newItem.price > 0) {
                await createExpenseRecord(newItem);
            }
            toggleFab();
        } catch (error) { Alert.alert("Error", "Failed to add activity."); }
    };

    const handleAddExpense = async (newItem: any) => {
        if (!tripId || !user) return;
        try {
            const currentTimeline = trip?.itinerary[dayIndex].timeline || [];
            const expenseItem = {
                ...newItem,
                type: 'expense',
                coordinates: null,
                id: Date.now().toString(),
                order: currentTimeline.length + 1
            };
            await TripService.addActivityToDay(tripId, dayIndex, expenseItem);

            if (newItem.price > 0) {
                await createExpenseRecord(newItem);
            }
            toggleFab();
        } catch (error) { Alert.alert("Error", "Failed to add expense."); }
    };

    const createExpenseRecord = async (item: any) => {
        if (!tripId || !user) return;
        const expenseItem = {
            title: item.title,
            amount: item.price,
            category: item.type,
            day: dayIndex + 1,
            date: new Date().toISOString(),
            addedBy: { uid: user.uid, name: user.displayName || 'User', avatar: user.photoURL || '' },
            createdAt: new Date(),
        };
        await TripService.addExpense(tripId, expenseItem);
    }

    // TS FIX: Use ExtendedTimelineItem to avoid 'id missing' error
    const handleDragEnd = async ({ data }: { data: ExtendedTimelineItem[] }) => {
        if (!tripId) return;
        const reorderedData = data.map((item, index) => ({ ...item, order: index + 1 }));
        if (trip && trip.itinerary[dayIndex]) {
            const updatedTrip = { ...trip };
            // TS FIX: Cast back to any/original type if needed
            updatedTrip.itinerary[dayIndex].timeline = reorderedData as TimelineItem[];
            setTrip(updatedTrip);
        }
        try { await TripService.updateDayTimeline(tripId, dayIndex, reorderedData as TimelineItem[]); } catch (e) { }
    };

    const handleDeleteActivity = async (itemIndex: number) => {
        if (!trip || !tripId) return;
        const currentTimeline = trip.itinerary[dayIndex].timeline;
        const newTimeline = currentTimeline.filter((_, index) => index !== itemIndex);
        const reindexedTimeline = newTimeline.map((item, index) => ({ ...item, order: index + 1 }));
        try { await TripService.updateDayTimeline(tripId, dayIndex, reindexedTimeline); } catch (e) { }
    };

    const renderTimelineItem = ({ item, getIndex, drag, isActive }: RenderItemParams<ExtendedTimelineItem>) => {
        const index = getIndex();
        if (index === undefined) return null;

        const hasLocation = item.coordinates && item.coordinates.latitude;

        const renderRightActions = () => (
            <TouchableOpacity style={styles.deleteAction} onPress={() => handleDeleteActivity(index)}>
                <IconSymbol name="trash.fill" size={24} color="#fff" />
            </TouchableOpacity>
        );

        return (
            <ScaleDecorator>
                <Swipeable renderRightActions={renderRightActions}>
                    <TouchableOpacity
                        onLongPress={drag}
                        disabled={isActive}
                        style={[styles.timelineWrapper, isActive && { opacity: 0.8 }]}
                        activeOpacity={1}
                    >
                        <View style={styles.timelineColumn}>
                            <View style={[styles.timelineDot, { borderColor: hasLocation ? colors.tint : colors.icon }]}>
                                {hasLocation ? (
                                    <ThemedText style={{ fontSize: 10, color: colors.tint, fontWeight: 'bold' }}>{index + 1}</ThemedText>
                                ) : (
                                    // ICON FIX: Use 'banknote' (iOS SF Symbol) or 'cash' (Ionicons) 
                                    <IconSymbol name="banknote" size={12} color={colors.icon} />
                                )}
                            </View>
                            <View style={[styles.timelineConnector, { backgroundColor: colors.icon + '30' }]} />
                        </View>
                        <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '15' }]}>
                            <View style={styles.cardContent}>
                                <View style={[styles.iconBox, { backgroundColor: hasLocation ? colors.tint + '15' : '#FFD70030' }]}>
                                    <IconSymbol name={getCategoryIcon(item.type) as any} size={22} color={hasLocation ? colors.tint : '#DAA520'} />
                                </View>
                                <View style={{ flex: 1, justifyContent: 'center' }}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1}>{item.title}</ThemedText>
                                    <ThemedText style={styles.categoryLabel}>{item.type}</ThemedText>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {item.price > 0 && <ThemedText style={styles.priceText}>${item.price}</ThemedText>}
                                </View>
                            </View>
                            <View style={styles.dragHandle}>
                                <IconSymbol name="line.3.horizontal" size={18} color={colors.icon + '40'} />
                            </View>
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            </ScaleDecorator>
        );
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
    if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return null;

    const currentDay = trip.itinerary[dayIndex];
    // TS FIX: Cast to ExtendedTimelineItem
    const timeline = (currentDay.timeline || []).sort((a, b) => a.order - b.order) as ExtendedTimelineItem[];

    const mapMarkers = timeline.filter(t => t.coordinates && t.coordinates.latitude);
    const startPoint = dayIndex === 0 ? trip.originCoordinates : trip.itinerary[dayIndex - 1].stopLocation;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <View style={StyleSheet.absoluteFill}>
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFill}
                        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                        initialRegion={{
                            latitude: startPoint?.latitude || 37.78825,
                            longitude: startPoint?.longitude || -122.4324,
                            latitudeDelta: 0.5,
                            longitudeDelta: 0.5,
                        }}
                    >
                        {startPoint && (
                            <Marker coordinate={startPoint} title="Start" zIndex={10}>
                                <View style={[styles.startMarker, { backgroundColor: '#222' }]}>
                                    {/* ICON FIX: Use 'play.fill' or 'play-arrow' */}
                                    <IconSymbol name="play.fill" size={10} color="#fff" />
                                </View>
                            </Marker>
                        )}
                        {mapMarkers.map((item, idx) => (
                            <Marker key={`m-${idx}-${item.title}`} coordinate={item.coordinates} title={item.title} zIndex={5}>
                                <View style={[styles.markerBadge, { backgroundColor: colors.tint }]}>
                                    <ThemedText style={styles.markerText}>{idx + 1}</ThemedText>
                                </View>
                            </Marker>
                        ))}
                        {dayRouteCoordinates.length > 0 && (
                            <Polyline coordinates={dayRouteCoordinates} strokeColor={colors.tint} strokeWidth={4} />
                        )}
                    </MapView>
                </View>

                {/* HEADER */}
                <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={[styles.gradientHeader, { height: insets.top + 80 }]} />
                <View style={[styles.headerControls, { top: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
                        <IconSymbol name="chevron.left" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleBox}>
                        <ThemedText style={styles.headerDayText}>Day {currentDay.day}</ThemedText>
                        <ThemedText style={styles.headerTitleText} numberOfLines={1}>{currentDay.title}</ThemedText>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                {/* BOTTOM SHEET */}
                {/* 1. WRAP ENTIRE SHEET IN DETECTOR */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.sheetContainer, { backgroundColor: colors.background, top: SCREEN_HEIGHT }, rBottomSheetStyle]}>
                        <View style={styles.sheetHandleContainer}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.icon + '40' }]} />
                        </View>

                        {/* 2. REMOVED simultaneousHandlers PROP to fix TS Error */}
                        <DraggableFlatList
                            data={timeline}
                            onDragEnd={handleDragEnd}
                            // TS FIX: Robust key extractor
                            keyExtractor={(item, index) => item.id || `item-${index}`}
                            renderItem={renderTimelineItem}
                            contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }}
                            showsVerticalScrollIndicator={false}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <IconSymbol name="map.fill" size={40} color={colors.icon + '40'} />
                                    <ThemedText style={{ color: colors.icon, marginTop: 10 }}>No activities yet.</ThemedText>
                                </View>
                            }
                        />

                        {/* SPEED DIAL */}
                        <View style={[styles.fabContainer, { bottom: insets.bottom + 20 }]}>
                            <Animated.View style={[styles.fabAction, { backgroundColor: '#FF9500' }, rAction2Style]}>
                                <TouchableOpacity onPress={() => setAddExpenseVisible(true)} style={styles.fabBtn}>
                                    {/* ICON FIX */}
                                    <IconSymbol name="banknote" size={20} color="#fff" />
                                    <ThemedText style={styles.fabActionLabel}>Expense</ThemedText>
                                </TouchableOpacity>
                            </Animated.View>

                            <Animated.View style={[styles.fabAction, { backgroundColor: colors.tint }, rAction1Style]}>
                                <TouchableOpacity onPress={() => setAddActivityVisible(true)} style={styles.fabBtn}>
                                    <IconSymbol name="mappin.and.ellipse" size={20} color="#fff" />
                                    <ThemedText style={styles.fabActionLabel}>Activity</ThemedText>
                                </TouchableOpacity>
                            </Animated.View>

                            <TouchableOpacity onPress={toggleFab} activeOpacity={0.8} style={[styles.fab, { backgroundColor: colors.text }]}>
                                <Animated.View style={rMainFabStyle}>
                                    <IconSymbol name="plus" size={28} color={colors.background} />
                                </Animated.View>
                            </TouchableOpacity>
                        </View>

                    </Animated.View>
                </GestureDetector>

                <AddActivityModal
                    visible={addActivityVisible}
                    onClose={() => setAddActivityVisible(false)}
                    onSave={handleAddActivity}
                />

                {/* TS FIX: Added itineraryDays prop */}
                <AddExpenseModal
                    visible={addExpenseVisible}
                    onClose={() => setAddExpenseVisible(false)}
                    onSave={handleAddExpense}
                    itineraryDays={trip.itinerary} />
            </ThemedView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradientHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
    headerControls: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    roundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    headerTitleBox: { alignItems: 'center' },
    headerDayText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    headerTitleText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    startMarker: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    markerBadge: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    markerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    sheetContainer: { position: 'absolute', left: 0, right: 0, height: SCREEN_HEIGHT, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
    sheetHandleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2 },
    timelineWrapper: { flexDirection: 'row', minHeight: 80 },
    timelineColumn: { width: 40, alignItems: 'center', marginRight: 8 },
    timelineDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', zIndex: 2, marginTop: 16 },
    timelineConnector: { width: 2, flex: 1, marginTop: -2 },
    card: { flex: 1, flexDirection: 'row', alignItems: 'center', marginBottom: 16, borderRadius: 16, borderWidth: 1, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    categoryLabel: { fontSize: 12, color: '#888', textTransform: 'capitalize', marginTop: 2 },
    priceText: { fontSize: 15, fontFamily: Fonts.bold, color: '#333' },
    dragHandle: { paddingLeft: 10, justifyContent: 'center' },
    deleteAction: { backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', width: 70, height: 70, borderRadius: 16, marginLeft: 8, marginTop: 16 },
    emptyState: { alignItems: 'center', padding: 40 },
    fabContainer: { position: 'absolute', right: 20, alignItems: 'flex-end' },
    fab: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4.65, elevation: 8, zIndex: 10 },
    fabAction: { position: 'absolute', right: 4, height: 48, borderRadius: 24, justifyContent: 'center', paddingHorizontal: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
    fabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fabActionLabel: { color: '#fff', fontWeight: 'bold', fontSize: 14 }
});