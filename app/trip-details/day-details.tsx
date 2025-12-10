import { db } from '@/firebaseConfig';
import { decode } from "@googlemaps/polyline-codec";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddActivityModal } from '@/components/ui/add-activity-modal';
import { AddExpenseModal } from '@/components/ui/add-expense-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { GeoPoint, Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RouteService } from '@/services/route-service';
import { TripService } from '@/services/trip-service';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT + 100;

// --- HELPERS ---
const toLatLng = (point?: any) => {
    if (!point) return null;
    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { latitude: lat, longitude: lng };
};

const toGeoPoint = (point?: any): GeoPoint | null => {
    if (!point) return null;
    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    return { lat, lng };
};

const getCategoryDetails = (type: string) => {
    switch (type.toLowerCase()) {
        case 'food': return { icon: 'fork.knife', color: '#E71D36' };
        case 'hotel': return { icon: 'bed.double.fill', color: '#2EC4B6' };
        case 'activities': return { icon: 'camera.fill', color: '#7209B7' };
        case 'fuel': return { icon: 'fuelpump.fill', color: '#FF9F1C' };
        case 'expense': return { icon: 'banknote', color: '#808080' };
        case 'other': return { icon: 'circle.grid.2x2.fill', color: '#808080' };
        default: return { icon: 'mappin.circle.fill', color: '#808080' };
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

    const swipeableRows = useRef(new Map());

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);

    const [addActivityVisible, setAddActivityVisible] = useState(false);
    const [editingActivity, setEditingActivity] = useState<any>(null);

    const [addExpenseVisible, setAddExpenseVisible] = useState(false);
    const [editingExpense, setEditingExpense] = useState<any>(null);

    const [dayRouteCoordinates, setDayRouteCoordinates] = useState<GeoPoint[]>([]);

    // NEW: State for Day Stats
    const [dayStats, setDayStats] = useState({ miles: '0', time: '0h 0m' });

    const translateY = useSharedValue(-SCREEN_HEIGHT * 0.55);
    const context = useSharedValue({ y: 0 });

    const gesture = Gesture.Pan()
        .onStart(() => { context.value = { y: translateY.value }; })
        .onUpdate((event) => {
            translateY.value = event.translationY + context.value.y;
            translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
        })
        .onEnd(() => {
            const timingConfig = { duration: 250, easing: Easing.out(Easing.quad) };
            if (translateY.value > -SCREEN_HEIGHT * 0.3) {
                translateY.value = withTiming(-SCREEN_HEIGHT * 0.15, timingConfig);
            } else if (translateY.value < -SCREEN_HEIGHT * 0.7) {
                translateY.value = withTiming(MAX_TRANSLATE_Y, timingConfig);
            } else {
                translateY.value = withTiming(-SCREEN_HEIGHT * 0.55, timingConfig);
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const closeRow = (id: string) => {
        const row = swipeableRows.current.get(id);
        if (row) row.close();
    };

    // --- 1. FETCH TRIP DATA ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribe = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) setTrip(data);
            else { Alert.alert("Error", "Trip not found"); router.back(); }
        });
        return () => unsubscribe();
    }, [tripId]);

    // --- 2. FETCH EXPENSES ---
    useEffect(() => {
        if (!tripId) return;
        const q = query(
            collection(db, 'trips', tripId, 'expenses'),
            where('day', '==', dayIndex + 1),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const loadedExpenses = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setExpenses(loadedExpenses);
        });
        return () => unsubscribe();
    }, [tripId, dayIndex]);

    // --- 3. ROUTE LOGIC (Updated to extract stats) ---
    // --- 3. ROUTE LOGIC (With Caching) ---
    useEffect(() => {
        const fetchDayRoute = async () => {
            if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return;

            const currentDay = trip.itinerary[dayIndex];
            const timeline = (currentDay.timeline || []).sort((a: any, b: any) => a.order - b.order);

            // --- A. Determine Start Point ---
            let startPoint = null;
            if (dayIndex === 0) {
                startPoint = toGeoPoint(trip.originCoordinates);
            } else {
                const prevDay = trip.itinerary[dayIndex - 1];
                if (prevDay) {
                    startPoint = toGeoPoint(prevDay.stopLocation);
                    const prevTimeline = prevDay.timeline || [];
                    if (!startPoint && prevTimeline.length > 0) {
                        startPoint = toGeoPoint(prevTimeline[prevTimeline.length - 1].coordinates);
                    }
                }
            }

            const mapItems = timeline.filter((t: any) => toGeoPoint(t.coordinates));

            // --- B. Fit Map to Markers (UI Only) ---
            if (mapRef.current) {
                const pointsToFit = mapItems.map((t: any) => toLatLng(t.coordinates));
                if (startPoint) {
                    const sp = toLatLng(startPoint);
                    if (sp) pointsToFit.unshift(sp);
                }
                const validPoints = pointsToFit.filter((p): p is { latitude: number; longitude: number } => !!p);
                if (validPoints.length > 0) {
                    mapRef.current.fitToCoordinates(validPoints, {
                        edgePadding: { top: 100, right: 50, bottom: 250, left: 50 },
                        animated: true,
                    });
                }
            }

            // --- C. Check Cache First ---
            // If we have a saved polyline, use it immediately and skip the API call.
            if (currentDay.routePolyline) {
                console.log("📍 Using cached route for Day", currentDay.day);
                try {
                    // Decode the polyline string back into coordinates
                    const points = decode(currentDay.routePolyline, 5).map(([lat, lng]) => ({
                        lat,
                        lng
                    }));
                    setDayRouteCoordinates(points);

                    // Note: If you also want to cache stats (miles/time), you should save them 
                    // to Firestore alongside the polyline and read them here.
                    // For now, we return early to save the API hit.
                    return;
                } catch (e) {
                    console.error("Failed to decode cached polyline:", e);
                    // If decode fails, fall through to API call
                }
            }

            // --- D. API Call (Fallback if no cache) ---
            if (!startPoint || mapItems.length === 0) {
                setDayRouteCoordinates([]);
                setDayStats({ miles: '0', time: '0h 0m' });
                return;
            }

            const stops = mapItems.map((t: any) => toGeoPoint(t.coordinates)).filter((c): c is GeoPoint => !!c);
            const destination = stops[stops.length - 1];
            const waypoints = stops.slice(0, -1);

            console.log("🌐 Fetching new route from Google API...");
            const result = await RouteService.getRoute(startPoint, destination, waypoints);

            if (result && result.points) {
                setDayRouteCoordinates(result.points);

                // 1. Calculate Stats
                const miles = (result.totalDistanceMeters * 0.000621371).toFixed(1);
                const totalSeconds = result.totalDurationSeconds;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const timeStr = `${hours}h ${minutes}m`;

                setDayStats({ miles, time: timeStr });

                // 2. Save to Cache (Firestore)
                if (result.encodedPolyline) {
                    await TripService.saveDayRoute(tripId, dayIndex, result.encodedPolyline);
                }
            }
        };

        fetchDayRoute();
    }, [trip, dayIndex]);

    // --- HANDLERS (Unchanged) ---
    const handleSaveActivity = async (itemData: any, createExpense: boolean) => {
        if (!tripId || !user || !trip) return;

        const currentTimeline = trip.itinerary[dayIndex].timeline || [];
        let updatedTimeline;

        if (editingActivity) {
            updatedTimeline = currentTimeline.map((t: any) =>
                t.id === editingActivity.id ? { ...t, ...itemData } : t
            );
        } else {
            const newItem = {
                ...itemData,
                id: Date.now().toString(),
                order: currentTimeline.length + 1
            };
            updatedTimeline = [...currentTimeline, newItem];
        }

        const updatedTrip = { ...trip };
        updatedTrip.itinerary[dayIndex].timeline = updatedTimeline;
        setTrip(updatedTrip);

        try {
            await TripService.updateDayTimeline(tripId, dayIndex, updatedTimeline);
            if (!editingActivity && createExpense && itemData.price > 0) {
                await handleSaveExpense(itemData);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to save activity.");
        } finally {
            setEditingActivity(null);
        }
    };

    const handleSaveExpense = async (itemData: any) => {
        if (!tripId || !user) return;
        const { id, ...cleanData } = itemData;
        const expensePayload = {
            title: itemData.title,
            amount: parseFloat(itemData.price || itemData.amount),
            category: itemData.type || itemData.category || 'expense',
            day: dayIndex + 1,
            date: editingExpense ? editingExpense.date : new Date().toISOString(),
            addedBy: editingExpense ? editingExpense.addedBy : { uid: user.uid, name: user.displayName || 'User', avatar: user.photoURL || '' },
            createdAt: editingExpense ? editingExpense.createdAt : new Date(),
            hasReceipt: !!itemData.receiptImage,
        };
        if (itemData.receiptImage) {
            (expensePayload as any).receiptImage = itemData.receiptImage;
        }
        try {
            if (editingExpense) {
                await TripService.updateExpense(tripId, editingExpense.id, expensePayload);
            } else {
                await TripService.addExpense(tripId, expensePayload);
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to save expense.");
        } finally {
            setEditingExpense(null);
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        Alert.alert("Delete Expense", "Are you sure you want to delete this expense?", [
            { text: "Cancel", style: "cancel", onPress: () => closeRow(expenseId) },
            {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                    closeRow(expenseId);
                    if (!tripId) return;
                    try {
                        const expenseToDelete = expenses.find(e => e.id === expenseId);
                        const amount = expenseToDelete ? Number(expenseToDelete.amount) : 0;
                        await TripService.deleteExpense(tripId, expenseId, amount);
                    } catch (error) {
                        Alert.alert("Error", "Failed to delete expense.");
                    }
                }
            }
        ]);
    };

    const handleDeleteActivity = async (itemIndex: number, itemId: string) => {
        closeRow(itemId);
        if (!trip || !tripId) return;
        const currentTimeline = trip.itinerary[dayIndex].timeline || [];
        const newTimeline = currentTimeline.filter((_: any, index: number) => index !== itemIndex);
        const reindexedTimeline = newTimeline.map((item: any, index: number) => ({ ...item, order: index + 1 }));

        const updatedTrip = { ...trip };
        updatedTrip.itinerary[dayIndex].timeline = reindexedTimeline;
        setTrip(updatedTrip);
        try { await TripService.updateDayTimeline(tripId, dayIndex, reindexedTimeline); } catch (e) { }
    };

    const handleEditActivityPress = (item: any) => {
        closeRow(item.id);
        setEditingActivity(item);
        setAddActivityVisible(true);
    };

    const handleEditExpensePress = (item: any) => {
        closeRow(item.id);
        setEditingExpense(item);
        setAddExpenseVisible(true);
    };

    const handleDragEnd = async ({ data }: { data: any[] }) => {
        if (!tripId || !trip) return;
        const reorderedData = data.map((item, index) => ({ ...item, order: index + 1 }));
        const updatedTrip = { ...trip };
        updatedTrip.itinerary[dayIndex].timeline = reorderedData;
        setTrip(updatedTrip);
        try { await TripService.updateDayTimeline(tripId, dayIndex, reorderedData); } catch (e) { }
    };

    const renderActivityItem = ({ item, getIndex, drag, isActive }: RenderItemParams<any>) => {
        const index = getIndex();
        if (index === undefined) return null;
        const { icon, color } = getCategoryDetails(item.type);
        const renderRightActions = () => (
            <View style={styles.rightActionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F5A623' }]}
                    onPress={() => handleEditActivityPress(item)}
                >
                    <IconSymbol name="pencil" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => handleDeleteActivity(index, item.id)}
                >
                    <IconSymbol name="trash.fill" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Delete</ThemedText>
                </TouchableOpacity>
            </View>
        );
        return (
            <ScaleDecorator>
                <View style={styles.timelineWrapper}>
                    <Swipeable
                        ref={(ref) => { if (ref && item.id) swipeableRows.current.set(item.id, ref); }}
                        renderRightActions={renderRightActions}
                        containerStyle={{ overflow: 'visible' }}
                    >
                        <TouchableOpacity
                            onLongPress={drag}
                            disabled={isActive}
                            style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '15' }]}
                            activeOpacity={0.9}
                        >
                            <View style={styles.cardContent}>
                                <View style={[styles.cardIconBox, { backgroundColor: color + '15' }]}>
                                    <IconSymbol name={icon as any} size={20} color={color} />
                                </View>
                                <View style={{ flex: 1, justifyContent: 'center', gap: 4 }}>
                                    <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 16 }}>{item.title}</ThemedText>
                                    <ThemedText style={styles.addressText} numberOfLines={1}>{item.address || item.desc || item.type}</ThemedText>
                                </View>
                                <View style={styles.dragHandle}>
                                    <IconSymbol name="line.3.horizontal" size={16} color={colors.icon + '40'} />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </Swipeable>
                </View>
            </ScaleDecorator>
        );
    };

    const renderExpenseItem = ({ item, index }: { item: any, index: number }) => {
        const { icon, color } = getCategoryDetails(item.category);
        const renderRightActions = () => (
            <View style={styles.rightActionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F5A623' }]}
                    onPress={() => handleEditExpensePress(item)}
                >
                    <IconSymbol name="pencil" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Edit</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                    onPress={() => handleDeleteExpense(item.id)}
                >
                    <IconSymbol name="trash.fill" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Delete</ThemedText>
                </TouchableOpacity>
            </View>
        );
        return (
            <View key={`${item.id}-${index}`} style={{ marginBottom: 12 }}>
                <Swipeable
                    ref={(ref) => { if (ref && item.id) swipeableRows.current.set(item.id, ref); }}
                    renderRightActions={renderRightActions}
                    containerStyle={{ overflow: 'visible' }}
                >
                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '15' }]}
                        activeOpacity={0.7}
                        onPress={() => { /* setSelectedExpense(item); // Needs Modal implementation */ }}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.cardIconBox, { backgroundColor: color + '15' }]}>
                                <IconSymbol name={icon as any} size={20} color={color} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 16 }}>{item.title}</ThemedText>
                                <ThemedText style={styles.addressText}>{item.category}</ThemedText>
                            </View>
                            <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                <ThemedText style={[styles.priceText, { color: '#FF3B30' }]}>-${item.amount}</ThemedText>
                                {item.addedBy?.avatar ? (
                                    <Image source={{ uri: item.addedBy.avatar }} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatar, { backgroundColor: '#ccc' }]} />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                </Swipeable>
            </View>
        );
    };

    if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.tint} /></View>;
    if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return null;

    const currentDay = trip.itinerary[dayIndex];
    const rawTimeline = (currentDay.timeline || []).sort((a: any, b: any) => a.order - b.order);
    const timeline = rawTimeline.map((item: any, idx: number) => ({
        ...item,
        id: item.id || `stable-id-${idx}-${item.title}`
    }));

    const mapMarkers = timeline.filter((t: any) => toLatLng(t.coordinates) !== null);
    let startPoint = null;
    if (dayIndex === 0) {
        startPoint = toGeoPoint(trip.originCoordinates);
    } else {
        const prevDay = trip.itinerary[dayIndex - 1];
        if (prevDay) {
            startPoint = toGeoPoint(prevDay.stopLocation);
            const prevTimeline = prevDay.timeline || [];
            if (!startPoint && prevTimeline.length > 0) {
                startPoint = toGeoPoint(prevTimeline[prevTimeline.length - 1].coordinates);
            }
        }
    }
    const hasMapData = (startPoint && toLatLng(startPoint)) || mapMarkers.length > 0;
    const initialLat = startPoint?.lat || 37.78825;
    const initialLng = startPoint?.lng || -122.4324;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* MAP */}
                {hasMapData ? (
                    <View style={StyleSheet.absoluteFill}>
                        <MapView
                            ref={mapRef}
                            style={StyleSheet.absoluteFill}
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                            initialRegion={{ latitude: initialLat, longitude: initialLng, latitudeDelta: 0.5, longitudeDelta: 0.5 }}
                        >
                            {startPoint && toLatLng(startPoint) && (
                                <Marker coordinate={toLatLng(startPoint)!} title="Start" zIndex={10}>
                                    <View style={[styles.startMarker, { backgroundColor: '#222' }]}>
                                        <IconSymbol name="play.fill" size={10} color="#fff" />
                                    </View>
                                </Marker>
                            )}
                            {mapMarkers.map((item: any, idx: number) => {
                                const coords = toLatLng(item.coordinates);
                                const { color } = getCategoryDetails(item.type);
                                if (!coords) return null;
                                return (
                                    <Marker key={`m-${idx}-${item.id}`} coordinate={coords} title={item.title} zIndex={5}>
                                        <View style={[styles.markerPill, { backgroundColor: color, borderColor: '#fff', borderWidth: 2 }]}>
                                            <ThemedText style={styles.markerText} numberOfLines={1}>{item.title}</ThemedText>
                                        </View>
                                    </Marker>
                                );
                            })}
                            {dayRouteCoordinates.length > 0 && (
                                <Polyline coordinates={dayRouteCoordinates.map(p => ({ latitude: p.lat, longitude: p.lng }))} strokeColor={colors.tint} strokeWidth={4} />
                            )}
                        </MapView>
                    </View>
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
                        <IconSymbol name="map.fill" size={80} color="#333" />
                        <ThemedText style={{ color: '#555', marginTop: 10, fontWeight: '600' }}>No route data yet</ThemedText>
                    </View>
                )}

                {/* HEADER */}
                <LinearGradient colors={['rgba(0,0,0,0.7)', 'transparent']} style={[styles.gradientHeader, { height: insets.top + 80 }]} />
                <View style={[styles.headerControls, { top: insets.top + 10 }]}>
                    <TouchableOpacity style={styles.roundButton} onPress={() => router.back()}>
                        <IconSymbol name="chevron.left" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* UPDATED HEADER TITLE BOX WITH STATS */}
                    <View style={styles.headerTitleBox}>
                        <ThemedText style={styles.headerDayText}>Day {currentDay.day}</ThemedText>
                        <ThemedText style={styles.headerTitleText} numberOfLines={1}>{currentDay.title}</ThemedText>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <IconSymbol name="car.fill" size={12} color="#ccc" />
                                <ThemedText style={{ color: '#ccc', fontSize: 12, fontWeight: '600' }}>{dayStats.miles} mi</ThemedText>
                            </View>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#666' }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <IconSymbol name="clock.fill" size={12} color="#ccc" />
                                <ThemedText style={{ color: '#ccc', fontSize: 12, fontWeight: '600' }}>{dayStats.time}</ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={{ width: 40 }} />
                </View>

                {/* BOTTOM SHEET */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.sheetContainer, { backgroundColor: colors.background, top: SCREEN_HEIGHT }, rBottomSheetStyle]}>
                        <View style={styles.sheetHandleContainer}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.icon + '40' }]} />
                        </View>

                        <DraggableFlatList
                            data={timeline}
                            onDragEnd={handleDragEnd}
                            keyExtractor={(item) => item.id}
                            renderItem={renderActivityItem}
                            contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            ListHeaderComponent={
                                <View style={[styles.sectionHeader, { marginTop: 10 }]}>
                                    <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Activities</ThemedText>
                                </View>
                            }
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <IconSymbol name="map.fill" size={40} color={colors.icon + '40'} />
                                    <ThemedText style={{ color: colors.icon, marginTop: 10 }}>Start your day plan below.</ThemedText>
                                </View>
                            }
                            ListFooterComponent={
                                <View style={styles.footerContainer}>
                                    <TouchableOpacity
                                        style={[styles.dashedButton, { borderColor: colors.icon + '60' }]}
                                        onPress={() => { setEditingActivity(null); setAddActivityVisible(true); }}
                                    >
                                        <IconSymbol name="mappin.and.ellipse" size={20} color={colors.text} />
                                        <ThemedText style={[styles.dashedButtonText, { color: colors.text }]}>Add Activity</ThemedText>
                                    </TouchableOpacity>

                                    {expenses.length > 0 && (
                                        <View style={styles.expensesSection}>
                                            <View style={styles.sectionHeader}>
                                                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Expenses</ThemedText>
                                                <ThemedText style={{ color: '#FF3B30', fontWeight: 'bold' }}>
                                                    -${expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                                                </ThemedText>
                                            </View>

                                            {expenses.map((expense, index) => (
                                                <View key={`${expense.id}-${index}`}>
                                                    {renderExpenseItem({ item: expense, index })}
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.dashedButton, { borderColor: colors.icon + '60' }]}
                                        onPress={() => { setEditingExpense(null); setAddExpenseVisible(true); }}
                                    >
                                        <IconSymbol name="banknote" size={20} color={colors.text} />
                                        <ThemedText style={[styles.dashedButtonText, { color: colors.text }]}>Add Expense</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            }
                        />
                    </Animated.View>
                </GestureDetector>

                <AddActivityModal
                    visible={addActivityVisible}
                    onClose={() => { setAddActivityVisible(false); setEditingActivity(null); }}
                    onSave={handleSaveActivity}
                    initialData={editingActivity}
                />
                <AddExpenseModal
                    visible={addExpenseVisible}
                    onClose={() => { setAddExpenseVisible(false); setEditingExpense(null); }}
                    onSave={handleSaveExpense}
                    itineraryDays={trip.itinerary}
                    tripStartDate={trip.startDate}
                    currentDayIndex={dayIndex}
                    initialData={editingExpense}
                />
            </ThemedView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    gradientHeader: { position: 'absolute', top: 0, left: 0, right: 0 },
    headerControls: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
    roundButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    headerTitleBox: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    headerDayText: { color: '#4CC9F0', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    headerTitleText: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
    startMarker: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    markerPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minWidth: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
    markerText: { color: '#fff', fontSize: 12, fontWeight: 'bold', maxWidth: 120 },
    sheetContainer: { position: 'absolute', left: 0, right: 0, height: SCREEN_HEIGHT, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5 },
    sheetHandleContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8 },
    sheetHandle: { width: 40, height: 4, borderRadius: 2 },
    timelineWrapper: { marginBottom: 20 },
    card: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addressText: { fontSize: 12, color: '#888', flex: 1 },
    priceText: { fontSize: 14, fontFamily: Fonts.bold },
    avatar: { width: 24, height: 24, borderRadius: 12, marginLeft: 6 },
    dragHandle: { marginTop: 0 },
    rightActionContainer: { flexDirection: 'row', height: '100%', paddingLeft: 8 },
    actionButton: { width: 70, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginLeft: 8 },
    actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    emptyState: { alignItems: 'center', padding: 30 },
    footerContainer: { gap: 12, marginTop: 10, paddingBottom: 100 },
    expensesSection: { marginTop: 10, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
    dashedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
    dashedButtonText: { fontSize: 16, fontFamily: Fonts.medium },
});