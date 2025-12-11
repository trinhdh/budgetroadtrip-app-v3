import { decode } from "@googlemaps/polyline-codec";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Keyboard,
    Modal, // <--- Ensure Modal is imported
    Platform,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- SERVICE & CONTEXT ---
import { GeoPoint, Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { RouteService } from '@/services/route-service';
import { TripService } from '@/services/trip-service';

// --- COMPONENTS ---
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- MODALS ---
import { BalancesModal } from '@/components/ui/balances-modal';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { ExpenseDetailModal } from '@/components/ui/expense-detail-modal';

const { width, height } = Dimensions.get('window');
const PARALLAX_HEADER_HEIGHT = 400;

// --- HELPERS ---

const getNormalizedPoint = (point: any): { lat: number, lng: number } | null => {
    if (!point) return null;
    const lat = point.lat ?? point.latitude;
    const lng = point.lng ?? point.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    if (lat === 0 && lng === 0) return null;
    return { lat, lng };
};

const toLatLng = (point: any) => {
    const p = getNormalizedPoint(point);
    if (!p) return null;
    return { latitude: p.lat, longitude: p.lng };
};

const formatVibe = (vibe?: string) => {
    if (!vibe) return 'Standard';
    return vibe.charAt(0).toUpperCase() + vibe.slice(1);
};

const getCategoryDetails = (category: string) => {
    switch (category.toLowerCase()) {
        case 'fuel': return { icon: 'speedometer', color: '#FF9F1C' };
        case 'food': return { icon: 'leaf', color: '#E71D36' };
        case 'hotel': return { icon: 'bed.double.fill', color: '#2EC4B6' };
        case 'activities': return { icon: 'camera.fill', color: '#7209B7' };
        default: return { icon: 'circle.grid.2x2.fill', color: '#808080' };
    }
};

const BudgetProgressBar = ({ current, total }: { current: number, total: number }) => {
    const percentage = Math.min((current / total) * 100, 100);
    let color = '#10B981';
    if (percentage > 75) color = '#F59E0B';
    if (percentage >= 100) color = '#EF4444';

    return (
        <View style={{ height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, width: '100%', marginVertical: 10, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${percentage}%`, backgroundColor: color, borderRadius: 4 }} />
        </View>
    );
};

// --- NEW COMPONENT: Edit Day Modal ---
type EditDayModalProps = {
    visible: boolean;
    onClose: () => void;
    day: any; // The ItineraryItem to edit
    onSave: (dayIndex: number, newTitle: string) => void;
};

const EditDayModal = ({ visible, onClose, day, onSave }: EditDayModalProps) => {
    const [title, setTitle] = useState(day?.title || '');
    const tintColor = Colors.light.tint;

    useEffect(() => {
        if (visible && day) {
            setTitle(day.title);
        }
    }, [visible, day]);

    const handleSave = () => {
        if (!day || !title.trim()) {
            Alert.alert("Invalid Input", "Title cannot be empty.");
            return;
        }
        onSave(day.dayIndex, title.trim());
    };

    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title={`Edit Day ${day?.day}`}
            height="35%"
        >
            <View style={{ padding: 20, flex: 1, justifyContent: 'space-between' }}>
                <View style={{ gap: 15 }}>
                    <ThemedText style={styles.paramLabel}>Day Title</ThemedText>
                    <TextInput
                        style={[styles.input, { borderColor: Colors.light.icon, color: Colors.light.text }]}
                        value={title}
                        onChangeText={setTitle}
                        placeholder={`Day ${day?.day} Title...`}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: tintColor }]}
                    onPress={handleSave}
                >
                    <ThemedText style={styles.saveButtonText}>Save Changes</ThemedText>
                </TouchableOpacity>
            </View>
        </BottomSheetModal>
    );
};
// --- END NEW COMPONENT ---

export default function TripDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const tripId = Array.isArray(id) ? id[0] : id;

    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);

    const [routeCoordinates, setRouteCoordinates] = useState<GeoPoint[]>([]);

    // STATS from Overview Route (Fallback)
    const [overviewStats, setOverviewStats] = useState<Record<string, { distance: string, duration: string }>>({});

    const [paramsModalVisible, setParamsModalVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [balancesVisible, setBalancesVisible] = useState(false);

    // --- NEW STATE FOR DAY EDITING ---
    const [editingDay, setEditingDay] = useState<any>(null);

    // --- REPLACED: Simple Modal State for Notes ---
    const [isNotesModalVisible, setNotesModalVisible] = useState(false);
    const [noteText, setNoteText] = useState('');

    // ---------------------------------

    const swipeableRows = useRef(new Map());
    const scrollViewRef = useRef<ScrollView>(null);

    const closeRow = (id: string) => {
        const row = swipeableRows.current.get(id);
        if (row) row.close();
    };

    // --- Handle Open/Close Notes Modal ---
    const handleOpenNotes = () => {
        setNoteText(trip?.notes || '');
        setNotesModalVisible(true);
    };

    // --- Handle Save Notes ---
    const handleSaveNotes = async () => {
        if (!tripId) return;

        // Dismiss Modal & Keyboard
        Keyboard.dismiss();
        setNotesModalVisible(false);

        try {
            await TripService.updateTripNotes(tripId, noteText);
            Alert.alert("Success", "Notes saved!");
        } catch (error) {
            Alert.alert("Error", "Failed to save notes.");
        }
    };
    // -------------------------

    // --- NEW: Handle Day Edit Press ---
    const handleEditDayPress = (day: any) => {
        closeRow(day.id || `day-${day.day}`);
        setEditingDay(day);
    };

    // --- NEW: Handle Day Save ---
    const handleSaveDayDetails = async (dayIndex: number, newTitle: string) => {
        if (!tripId) return;

        try {
            await TripService.updateDayDetails(tripId, dayIndex, {
                title: newTitle,
                description: trip?.itinerary[dayIndex].description || '' // Keep old description
            });
            Alert.alert("Success", `Day ${dayIndex + 1} updated!`);
        } catch (error) {
            Alert.alert("Error", "Failed to update day details.");
        } finally {
            setEditingDay(null);
        }
    };
    // ---------------------------------


    // --- NEW: Handle Day Deletion ---
    const handleDeleteDay = (dayId: string, dayIndex: number) => {
        closeRow(dayId);

        Alert.alert(
            "Delete Day",
            `Are you sure you want to delete Day ${dayIndex + 1}? All associated activities will be removed.`,
            [
                { text: "Cancel", style: "cancel", onPress: () => { } },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        if (!tripId) return;
                        try {
                            // This calls the new backend logic to remove the day and clear cache
                            await TripService.deleteDayFromTrip(tripId, dayIndex);
                            Alert.alert("Success", `Day ${dayIndex + 1} deleted.`);
                        } catch (error) {
                            Alert.alert("Error", "Failed to delete the day.");
                        }
                    }
                }
            ]
        );
    };


    // --- Add Day Handler ---
    const handleAddDay = async () => {
        if (!tripId || !trip) return;

        const startCity = trip.startCity;
        const destination = trip.destination;
        const destinationCoordinates = trip.originCoordinates || { lat: 0, lng: 0 };

        try {
            const newDayNumber = await TripService.addDayToTrip(
                tripId,
                trip.duration,
                startCity,
                destination,
                destinationCoordinates
            );

            Alert.alert("Success", `Day ${newDayNumber} added to your itinerary!`);

            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 50);
        } catch (error) {
            Alert.alert("Error", "Failed to add new day to the itinerary.");
        }
    };

    // --- 1. FETCH TRIP ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribeTrip = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) {
                setTrip(data);
                // Load cached stats immediately if available
                if (data.overviewStats) {
                    setOverviewStats(data.overviewStats);
                }
            } else {
                Alert.alert("Error", "Trip not found");
                router.back();
            }
        });
        return () => unsubscribeTrip();
    }, [tripId]);

    // --- 2. FETCH EXPENSES ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribeExpenses = TripService.subscribeToExpenses(tripId, (fetchedExpenses) => {
            setExpenses(fetchedExpenses);
        });
        return () => unsubscribeExpenses();
    }, [tripId]);

    // --- 3. FETCH / CACHE ROUTE ---
    useEffect(() => {
        const fetchRoute = async () => {
            if (!trip || !trip.itinerary || trip.itinerary.length === 0) return;

            // A. CHECK CACHE FIRST
            if (trip.overviewPolyline) {
                try {
                    const points = decode(trip.overviewPolyline, 5).map(([lat, lng]) => ({ lat, lng }));
                    setRouteCoordinates(points);
                    return;
                } catch (e) {
                    console.error("Error decoding overview cache, falling back to API", e);
                }
            }

            // B. PREPARE API CALL
            const dayEndPoints: { lat: number, lng: number }[] = [];

            // COLLECT WAYPOINTS: Origin -> Day 1 End -> Day 2 End -> ...
            trip.itinerary.forEach((day: any) => {
                let endPoint: { lat: number, lng: number } | null = null;
                const stopLoc = getNormalizedPoint(day.stopLocation);
                if (stopLoc) {
                    endPoint = stopLoc;
                }
                else if (day.timeline && day.timeline.length > 0) {
                    const sortedActivities = [...day.timeline].sort((a: any, b: any) => a.order - b.order);
                    for (let i = sortedActivities.length - 1; i >= 0; i--) {
                        const actPoint = getNormalizedPoint(sortedActivities[i].coordinates);
                        if (actPoint) {
                            endPoint = actPoint;
                            break;
                        }
                    }
                }
                if (endPoint) {
                    dayEndPoints.push(endPoint);
                }
            });

            if (dayEndPoints.length === 0) return;

            const startLocation = getNormalizedPoint(trip.originCoordinates);
            const endLocation = dayEndPoints[dayEndPoints.length - 1];
            const intermediateWaypoints = dayEndPoints.slice(0, -1);

            if (startLocation && endLocation) {
                try {
                    const result = await RouteService.getRoute(
                        startLocation,
                        endLocation,
                        intermediateWaypoints
                    );

                    if (result && result.points) {
                        setRouteCoordinates(result.points);

                        // C. CALCULATE STATS
                        const newOverviewStats: Record<number, { distance: string, duration: string }> = {};

                        result.legs.forEach((leg, index) => {
                            const legMiles = (leg.distanceMeters * 0.000621371).toFixed(0);
                            const legSec = parseInt((leg.duration || "0s").replace('s', ''), 10);
                            const lHours = Math.floor(legSec / 3600);
                            const lMins = Math.floor((legSec % 3600) / 60);

                            newOverviewStats[index] = {
                                distance: `${legMiles} mi`,
                                duration: `${lHours}h ${lMins}m`
                            };
                        });

                        setOverviewStats(newOverviewStats);

                        // D. SAVE TO CACHE
                        if (result.encodedPolyline) {
                            await TripService.saveOverviewData(trip.id!, result.encodedPolyline, newOverviewStats);
                        }
                    }
                } catch (e) {
                    console.error("Failed to fetch route", e);
                }
            }
        };

        fetchRoute();
    }, [trip]);

    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [expenses]);

    const budgetPercent = trip ? (totalSpent / trip.budget) * 100 : 0;
    const isOverBudget = trip && totalSpent > trip.budget;
    const isNearBudget = !isOverBudget && budgetPercent >= 90;

    const isManualTrip = trip && trip.mode === 'manual';

    const getDateRange = () => {
        if (!trip?.startDate) return 'TBD';
        const start = new Date(trip.startDate);
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        // Calculate end date based on duration
        let endDate = new Date(start);
        endDate.setDate(start.getDate() + trip.duration - 1);

        const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startStr} - ${endStr}`;
    };

    const handleShare = async () => {
        try {
            const deepLink = `budgetroadtrip://trip-details/${tripId}`;
            const message = `Join my road trip to ${trip?.destination}! 🚗💨\n\nTap here to collaborate: ${deepLink}`;
            await Share.share({ message, title: `Join Trip: ${trip?.destination}`, url: deepLink });
        } catch (error: any) {
            Alert.alert("Share failed", error.message);
        }
    };


    const handleDeleteExpense = async (expenseId: string) => {
        closeRow(expenseId);
        if (!tripId) return;
        try {
            const expenseToDelete = expenses.find(e => e.id === expenseId);
            const amount = expenseToDelete ? Number(expenseToDelete.amount) : 0;
            await TripService.deleteExpense(tripId, expenseId, amount);
        } catch (error) {
            Alert.alert("Error", "Failed to delete expense.");
        }
    };

    const handleEditExpensePress = (item: any) => {
        closeRow(item.id);
        router.push({
            pathname: '/trip-details/expense',
            params: { tripId: tripId, expense: JSON.stringify(item) }
        });
    };

    const [isMapMaximized, setIsMapMaximized] = useState(false);
    const mapRef = useRef<MapView>(null);
    const scrollY = useRef(new Animated.Value(0)).current;

    const mapTranslateY = scrollY.interpolate({
        inputRange: [-PARALLAX_HEADER_HEIGHT, 0, PARALLAX_HEADER_HEIGHT],
        outputRange: [PARALLAX_HEADER_HEIGHT * 0.5, 0, -PARALLAX_HEADER_HEIGHT * 0.5],
        extrapolate: 'clamp',
    });

    const mapScale = scrollY.interpolate({
        inputRange: [-PARALLAX_HEADER_HEIGHT, 0],
        outputRange: [1.5, 1],
        extrapolateLeft: 'extend',
        extrapolateRight: 'clamp',
    });

    const toggleMapMaximize = () => setIsMapMaximized(!isMapMaximized);

    const focusOnDay = useCallback((day: any) => {
        const coords = toLatLng(day.stopLocation);
        if (mapRef.current && coords) {
            mapRef.current.animateToRegion({
                latitude: coords.latitude,
                longitude: coords.longitude,
                latitudeDelta: 2,
                longitudeDelta: 2,
            }, 800);
        }
    }, []);

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0 && viewableItems[0].item) {
            focusOnDay(viewableItems[0].item);
        }
    }).current;

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

    const renderExpenseItem = (item: any, index: number) => {
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
                        onPress={() => setSelectedExpense(item)}
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

    // --- RENDER ITINERARY ITEM ---
    const renderItineraryItem = (day: any, index: number) => {
        const dayId = day.id || `day-${day.day}`;
        const isLast = index === (trip?.itinerary?.length || 0) - 1;
        const dayNum = index + 1;
        const paddedDay = dayNum < 10 ? `0${dayNum}` : dayNum;

        // Stats Logic
        const hasActivities = (day.timeline && day.timeline.length > 0);
        let driveText = "Tap to view route";

        if (!hasActivities) {
            driveText = "0 mi • 0h 0m drive";
        } else {
            const stats = day.routeStats || overviewStats[index];
            if (stats && stats.distance && stats.duration) {
                driveText = `${stats.distance} • ${stats.duration} drive`;
            }
        }

        // Right Actions (Swipe Left)
        const renderRightActions = () => (
            <View style={[styles.rightActionContainer, { height: '100%' }]}>
                {/* NEW: Edit Button */}
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#F5A623', width: 70, marginLeft: 8 }]}
                    onPress={() => handleEditDayPress({ ...day, dayIndex: index })}
                >
                    <IconSymbol name="pencil" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Edit</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#FF3B30', width: 80, marginLeft: 8 }]}
                    onPress={() => handleDeleteDay(dayId, index)}
                >
                    <IconSymbol name="trash.fill" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Delete</ThemedText>
                </TouchableOpacity>
            </View>
        );


        return (
            <View key={dayId} style={styles.stepItemWrapper}>
                <Swipeable
                    ref={(ref) => { if (ref && dayId) swipeableRows.current.set(dayId, ref); }}
                    renderRightActions={renderRightActions}
                    containerStyle={{ overflow: 'visible' }}
                >
                    <View style={styles.stepItem}>
                        <View style={styles.stepLeft}>
                            <ThemedText style={styles.stepDayLabel}>DAY</ThemedText>
                            <ThemedText style={[styles.stepDayValue, { color: colors.tint }]}>{paddedDay}</ThemedText>
                            {!isLast && <View style={[styles.stepLine, { backgroundColor: colors.icon + '20' }]} />}
                        </View>
                        <TouchableOpacity
                            style={[styles.stepCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
                            onPress={() => router.push({ pathname: '/trip-details/day-details', params: { tripId: tripId, dayIndex: index } })}
                            activeOpacity={0.7}
                        >
                            <View style={{ flex: 1 }}>
                                <ThemedText type="defaultSemiBold" style={styles.stepCardTitle}>{day.title}</ThemedText>
                                <View style={styles.stepCardMeta}>
                                    <IconSymbol name="car" size={14} color="#808080" />
                                    <ThemedText style={styles.grayText}>
                                        {driveText}
                                    </ThemedText>
                                </View>
                            </View>
                            <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                        </TouchableOpacity>
                    </View>
                </Swipeable>
            </View>
        );
    };

    if (loading) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.tint} />
        </View>
    );

    if (!trip) return (
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ThemedText>Trip not found.</ThemedText>
            <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                <ThemedText style={{ color: colors.tint }}>Go Back</ThemedText>
            </TouchableOpacity>
        </View>
    );

    const initialLat = getNormalizedPoint(trip.originCoordinates)?.lat || 37.78825;
    const initialLng = getNormalizedPoint(trip.originCoordinates)?.lng || -122.4324;
    const headerCostDisplay = trip.estimatedCost > 0 ? `~${Math.round(trip.estimatedCost)}` : `$${trip.budget}`;

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />

                <Animated.View style={[
                    styles.parallaxHeader,
                    {
                        height: isMapMaximized ? height : PARALLAX_HEADER_HEIGHT,
                        transform: isMapMaximized ? [] : [{ translateY: mapTranslateY }, { scale: mapScale }],
                        zIndex: isMapMaximized ? 200 : 0,
                    }
                ]}>
                    <MapView
                        ref={mapRef}
                        style={StyleSheet.absoluteFill}
                        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                        initialRegion={{ latitude: initialLat, longitude: initialLng, latitudeDelta: 8.0, longitudeDelta: 8.0 }}
                        scrollEnabled={isMapMaximized}
                        zoomEnabled={isMapMaximized}
                    >
                        {routeCoordinates.length > 0 ? (
                            <Polyline
                                coordinates={routeCoordinates.map(p => ({ latitude: p.lat, longitude: p.lng }))}
                                strokeColor={colors.tint}
                                strokeWidth={4}
                            />
                        ) : (
                            trip.itinerary && trip.itinerary.length > 0 && (
                                <Polyline
                                    coordinates={[
                                        ...(toLatLng(trip.originCoordinates) ? [toLatLng(trip.originCoordinates)!] : []),
                                        ...trip.itinerary
                                            .map(day => toLatLng(day.stopLocation))
                                            .filter((p): p is { latitude: number, longitude: number } => !!p)
                                    ]}
                                    strokeColor={colors.tint}
                                    strokeWidth={2}
                                    lineDashPattern={[10, 5]}
                                />
                            )
                        )}

                        {toLatLng(trip.originCoordinates) && (
                            <Marker coordinate={toLatLng(trip.originCoordinates)!} title={`Start: ${trip.startCity}`} zIndex={20}>
                                <View style={[styles.dayMarkerPill, { backgroundColor: '#333', borderColor: '#fff' }]}>
                                    <Text style={styles.dayMarkerText}>START</Text>
                                </View>
                                <View style={[styles.markerArrow, { borderTopColor: '#333' }]} />
                            </Marker>
                        )}

                        {trip.itinerary?.map((day, index) => {
                            const coords = toLatLng(day.stopLocation);
                            if (!coords) return null;
                            return (
                                <Marker key={`day-${day.day}`} coordinate={coords} title={day.title} zIndex={10}>
                                    <View style={[styles.dayMarkerPill, { backgroundColor: colors.tint }]}>
                                        <Text style={styles.dayMarkerText}>Day {index + 1}</Text>
                                    </View>
                                    <View style={[styles.markerArrow, { borderTopColor: colors.tint }]} />
                                </Marker>
                            );
                        })}

                        {trip.itinerary?.flatMap((day) =>
                            day.timeline?.map((item: any, index: number) => {
                                if (!['food', 'hotel', 'activities'].includes(item.type?.toLowerCase() || '')) return null;
                                const coords = toLatLng(item.coordinates);
                                if (!coords) return null;

                                const { icon, color } = getCategoryDetails(item.type);
                                return (
                                    <Marker
                                        key={`activity-${day.day}-${index}`}
                                        coordinate={coords}
                                        title={item.title}
                                        description={item.type}
                                        anchor={{ x: 0.5, y: 0.5 }}
                                        zIndex={5}
                                    >
                                        <View style={[styles.miniActivityMarker, { backgroundColor: color }]}>
                                            <IconSymbol name={icon as any} size={12} color="#fff" />
                                        </View>
                                    </Marker>
                                );
                            })
                        )}
                    </MapView>

                    {!isMapMaximized && (
                        <LinearGradient
                            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    )}

                    {isMapMaximized && (
                        <>
                            <TouchableOpacity style={[styles.closeMapButton, { top: insets.top + 10 }]} onPress={toggleMapMaximize}>
                                <IconSymbol name="xmark" size={20} color="#333" />
                            </TouchableOpacity>

                            <View style={[styles.carouselContainer, { paddingBottom: insets.bottom + 20 }]}>
                                <FlatList
                                    data={trip.itinerary}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={width * 0.8 + 15}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                    keyExtractor={(item) => item.day.toString()}
                                    onViewableItemsChanged={onViewableItemsChanged}
                                    viewabilityConfig={viewabilityConfig}
                                    renderItem={({ item, index }) => {
                                        // PRIORITIZE DAY CACHE STATS
                                        const stats = item.routeStats || overviewStats[index];
                                        return (
                                            <TouchableOpacity style={styles.mapCard} onPress={() => setIsMapMaximized(false)} activeOpacity={0.9}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.mapCardTitle}>Day {index + 1}: {item.title}</Text>
                                                    <Text style={styles.mapCardSubtitle}>
                                                        {stats
                                                            ? `${stats.distance} • ${stats.duration}`
                                                            : "Tap to view route"}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                />
                            </View>
                        </>
                    )}
                </Animated.View>

                {/* NAVBAR */}
                {!isMapMaximized && (
                    <View style={[styles.navBar, { top: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.glassButton}>
                            <IconSymbol name="chevron.left" size={24} color="#fff" />
                        </TouchableOpacity>

                        <View style={styles.navRightGroup}>
                            <TouchableOpacity onPress={handleShare} style={styles.glassButton}>
                                <IconSymbol name="square.and.arrow.up" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.glassButton} onPress={toggleMapMaximize} activeOpacity={0.7}>
                                <IconSymbol name="map.fill" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.glassPill, isOverBudget && { backgroundColor: '#FF3B30' }, isNearBudget && { backgroundColor: '#FF9500' }]}
                                onPress={() => setParamsModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <ThemedText style={styles.budgetText}>{headerCostDisplay}</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* SCROLL CONTENT */}
                <Animated.ScrollView
                    ref={scrollViewRef as any}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    scrollEventThrottle={16}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    style={[styles.scrollView, { opacity: isMapMaximized ? 0 : 1 }]}
                    pointerEvents={isMapMaximized ? "none" : "box-none"}
                >
                    <View style={{ height: PARALLAX_HEADER_HEIGHT - 60 }} pointerEvents="none" />

                    <View style={[styles.bodyContainer, { backgroundColor: colors.background }]} pointerEvents="auto">
                        <View style={styles.titleSection}>
                            <ThemedText style={styles.tripLabel}>Trip to</ThemedText>
                            <ThemedText style={styles.destinationTitle}>{trip.destination}</ThemedText>
                            <View style={styles.subtitleRow}>
                                <IconSymbol name="paperplane.fill" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>From {trip.startCity}</ThemedText>
                                <View style={styles.dotSeparator} />
                                <IconSymbol name="calendar" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>{getDateRange()}</ThemedText>
                            </View>
                        </View>

                        {/* --- NEW: NOTES SECTION --- */}
                        <View style={styles.section}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Trip Notes</ThemedText>
                            <TouchableOpacity
                                style={[styles.noteCard, { borderColor: colors.icon + '20', backgroundColor: colors.background }]}
                                onPress={handleOpenNotes}
                                activeOpacity={0.7}
                            >
                                <View style={styles.noteContent}>
                                    <IconSymbol name="pencil" size={24} color={colors.text} />
                                    <View style={{ flex: 1 }}>
                                        <ThemedText type="defaultSemiBold">
                                            {trip?.notes ? "Edit Notes" : "Add Notes"}
                                        </ThemedText>
                                        <ThemedText style={styles.notesPreview} numberOfLines={1}>
                                            {trip?.notes || "Tap to add packing lists, reminders, etc."}
                                        </ThemedText>
                                    </View>
                                    <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                                </View>
                            </TouchableOpacity>
                        </View>
                        {/* --- END NOTES SECTION --- */}

                        {/* Budget Breakdown */}
                        {trip.estimatedBreakdown && trip.estimatedBreakdown.length > 0 && (
                            <View style={styles.section}>
                                <ThemedText type="subtitle" style={styles.sectionTitle}>Budget Breakdown</ThemedText>
                                <View style={styles.budgetGrid}>
                                    {trip.estimatedBreakdown.map((item, index) => {
                                        const { icon, color } = getCategoryDetails(item.category);
                                        return (
                                            <View key={index} style={[styles.budgetCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                                                <View style={[styles.budgetIconContainer, { backgroundColor: color + '20' }]}>
                                                    <IconSymbol name={icon as any} size={18} color={color} />
                                                </View>
                                                <View>
                                                    <ThemedText style={styles.budgetAmount}>${item.amount}</ThemedText>
                                                    <ThemedText style={styles.budgetLabel}>{item.category}</ThemedText>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        )}

                        {/* Expenses Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText type="subtitle" style={[styles.sectionTitle, { marginBottom: 0 }]}>Expenses</ThemedText>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                                    <ThemedText style={{ color: '#FF3B30', fontFamily: Fonts.bold, fontSize: 16 }}>-${totalSpent.toFixed(2)}</ThemedText>
                                </View>
                            </View>

                            {(isOverBudget || isNearBudget) && (
                                <View style={[styles.warningBanner, { backgroundColor: isOverBudget ? '#FFEBEE' : '#FFF3E0' }]}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={18} color={isOverBudget ? '#C62828' : '#EF6C00'} />
                                    <ThemedText style={[styles.warningText, { color: isOverBudget ? '#C62828' : '#EF6C00' }]}>
                                        {isOverBudget ? `Over Budget by $${(totalSpent - trip.budget).toFixed(0)}!` : `Approaching limit: ${budgetPercent.toFixed(0)}% spent`}
                                    </ThemedText>
                                </View>
                            )}

                            {expenses.length > 0 && (
                                <View style={{ gap: 0 }}>
                                    {expenses.map((item, index) => renderExpenseItem(item, index))}
                                </View>
                            )}

                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/trip-details/expense', params: { tripId: tripId } })}
                                style={[styles.addItemButton, { borderColor: colors.icon + '40', marginTop: 16 }]}
                            >
                                <IconSymbol name="plus" size={20} color={colors.text} />
                                <ThemedText style={styles.addItemText}>Add Expense</ThemedText>
                            </TouchableOpacity>
                        </View>

                        {/* Itinerary */}
                        <View style={styles.section}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Itinerary</ThemedText>
                            <View style={styles.timelineList}>
                                {trip.itinerary?.map((day, index) => renderItineraryItem(day, index))}
                            </View>

                            {/* ADD NEW DAY BUTTON */}
                            <TouchableOpacity
                                style={[styles.addItemButton, { borderColor: colors.tint, backgroundColor: colors.tint + '10', marginTop: 16 }]}
                                onPress={handleAddDay}
                            >
                                <IconSymbol name="plus" size={20} color={colors.tint} />
                                <ThemedText style={[styles.addItemText, { color: colors.tint }]}>Add New Day</ThemedText>
                            </TouchableOpacity>

                        </View>
                    </View>
                </Animated.ScrollView>

                {/* MODALS */}
                <BalancesModal visible={balancesVisible} onClose={() => setBalancesVisible(false)} debts={[]} currentUser="u1" onSettle={() => { }} />

                <ExpenseDetailModal visible={!!selectedExpense} onClose={() => setSelectedExpense(null)} expense={selectedExpense} />
                <EditDayModal
                    visible={!!editingDay}
                    onClose={() => setEditingDay(null)}
                    day={editingDay}
                    onSave={(dayIndex, newTitle) => {
                        handleSaveDayDetails(dayIndex, newTitle);
                    }}
                />
                <BottomSheetModal
                    isVisible={paramsModalVisible}
                    onClose={() => setParamsModalVisible(false)}
                    title="Trip Details"
                    height="65%"
                >
                    <ScrollView>
                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>Dates</ThemedText>
                            <View style={{ alignItems: 'flex-end' }}>
                                <ThemedText style={styles.paramValue}>{getDateRange()}</ThemedText>
                                <ThemedText style={{ fontSize: 12, color: '#808080' }}>{trip.duration} Days</ThemedText>
                            </View>
                        </View>
                        <View style={styles.paramSeparator} />

                        {/* CONDITIONAL RENDERING: AI-related fields are hidden for manual trips */}
                        {/* A trip is manual if the vibe is explicitly saved as null */}
                        {!isManualTrip && (
                            <>
                                {/* Trip Vibe */}
                                <View style={styles.paramRow}>
                                    <ThemedText style={styles.paramLabel}>Trip Vibe</ThemedText>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <IconSymbol name="star.fill" size={16} color={colors.tint} />
                                        <ThemedText style={styles.paramValue}>{formatVibe(trip.vibe!)}</ThemedText>
                                    </View>
                                </View>
                                <View style={styles.paramSeparator} />

                                {/* Travelers */}
                                <View style={styles.paramRow}>
                                    <ThemedText style={styles.paramLabel}>Travelers</ThemedText>
                                    <ThemedText style={styles.paramValue}>{trip.travelers?.adults || 1} Adults, {trip.travelers?.children || 0} Children</ThemedText>
                                </View>
                                <View style={styles.paramSeparator} />

                                {/* Vehicle */}
                                <View style={styles.paramRow}>
                                    <ThemedText style={styles.paramLabel}>Vehicle</ThemedText>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <ThemedText style={styles.paramValue}>{trip.vehicle?.name || "N/A"}</ThemedText>
                                        <ThemedText style={{ fontSize: 12, color: '#808080' }}>{trip.vehicle?.mpg || 0} mpg • ${trip.vehicle?.gasPrice || 0}/gal</ThemedText>
                                    </View>
                                </View>
                                <View style={styles.paramSeparator} />
                            </>
                        )}

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>My Budget</ThemedText>
                            <ThemedText style={styles.paramValue}>${trip.budget}</ThemedText>
                        </View>
                        <View style={styles.paramSeparator} />

                        {/* AI Estimate only for AI trips */}
                        {trip.estimatedCost > 0 && !isManualTrip && (
                            <>
                                <View style={styles.paramRow}>
                                    <ThemedText style={styles.paramLabel}>AI Estimate</ThemedText>
                                    <ThemedText style={styles.paramValue}>~${Math.round(trip.estimatedCost)}</ThemedText>
                                </View>
                                <View style={styles.paramSeparator} />
                            </>
                        )}
                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>Total Spent</ThemedText>
                            <ThemedText style={[styles.paramValue, isOverBudget && { color: '#FF3B30' }]}>${totalSpent.toFixed(2)}</ThemedText>
                        </View>
                        <BudgetProgressBar current={totalSpent} total={trip.budget} />
                    </ScrollView>
                </BottomSheetModal>

                {/* --- NEW: Simple React Native Modal for Notes --- */}
                <Modal
                    visible={isNotesModalVisible}
                    animationType="slide"
                    presentationStyle="pageSheet"
                    onRequestClose={() => setNotesModalVisible(false)}
                >
                    <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
                        <View style={[styles.modalHeader, { borderBottomColor: colors.icon + '30' }]}>
                            <TouchableOpacity onPress={() => setNotesModalVisible(false)}>
                                <ThemedText style={{ color: colors.tint, fontSize: 16 }}>Cancel</ThemedText>
                            </TouchableOpacity>
                            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Trip Notes</ThemedText>
                            <TouchableOpacity onPress={handleSaveNotes}>
                                <ThemedText style={{ fontWeight: 'bold', color: colors.tint, fontSize: 16 }}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={[styles.modalInput, { color: colors.text }]}
                            multiline
                            placeholder="Write your notes here..."
                            placeholderTextColor="#999"
                            value={noteText}
                            onChangeText={setNoteText}
                            textAlignVertical="top"
                            autoFocus
                        />
                    </View>
                </Modal>
                {/* --- END NOTES MODAL --- */}

            </ThemedView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    scrollView: { flex: 1 },
    parallaxHeader: { position: 'absolute', top: 0, left: 0, right: 0, width: '100%', zIndex: 0, overflow: 'hidden' },
    bodyContainer: { flex: 1, borderTopLeftRadius: 30, borderTopRightRadius: 30, minHeight: height - PARALLAX_HEADER_HEIGHT, paddingTop: 30, marginTop: -30, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
    navBar: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 },
    navRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    glassButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    glassPill: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', alignItems: 'center', height: 40 },
    budgetText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },
    addItemButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
    addItemText: { fontSize: 16, fontFamily: Fonts.medium, color: '#666' },
    warningBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, marginBottom: 12, gap: 8 },
    warningText: { fontSize: 14, fontWeight: 'bold' },
    closeMapButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 5, zIndex: 201 },
    carouselContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 201 },
    mapCard: { width: width * 0.8, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginRight: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 5, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    dayBadgeSmall: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginRight: 12 },
    dayBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    mapCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    mapCardSubtitle: { fontSize: 14, color: '#888', marginTop: 2 },
    cardArrow: { padding: 8 },
    titleSection: { paddingHorizontal: 20, marginBottom: 20 },
    tripLabel: { color: '#666', fontSize: 14, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1, fontFamily: Fonts.medium },
    destinationTitle: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 10, color: '#1a1a1a', lineHeight: 32 },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subtitleText: { color: '#666', fontSize: 15, fontFamily: Fonts.medium },
    dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 4 },
    dayMarkerPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    markerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -2 },
    dayMarkerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 18, marginBottom: 12, color: '#111' },
    budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    budgetCard: { width: '48%', padding: 12, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    budgetIconContainer: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    budgetAmount: { fontSize: 16, fontFamily: Fonts.bold },
    budgetLabel: { fontSize: 12, color: '#808080', textTransform: 'capitalize' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    expensesListContainer: { gap: 10 },
    modalSubtitle: { fontSize: 14, color: '#808080', marginBottom: 24 },
    paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    paramValue: { fontSize: 16, fontFamily: Fonts.bold },
    paramSeparator: { height: 1, backgroundColor: '#F0F0F0' },
    timelineList: { paddingLeft: 0 },
    stepItemWrapper: { marginBottom: 20 },
    stepItem: { flexDirection: 'row', paddingRight: 8 },
    stepLeft: { alignItems: 'center', marginRight: 16, width: 40, paddingTop: 8 },
    stepDayLabel: { fontSize: 10, fontWeight: 'bold', color: '#999', letterSpacing: 1, marginBottom: 2 },
    stepDayValue: { fontSize: 24, fontFamily: Fonts.bold, lineHeight: 28 },
    stepLine: { flex: 1, width: 2, backgroundColor: '#eee', marginTop: 8, borderRadius: 1 },
    stepCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    stepCardTitle: { fontSize: 16, marginBottom: 4, color: '#333' },
    stepCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    grayText: { color: '#808080', fontSize: 13 },
    miniActivityMarker: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
    // --- CARD STYLES ---
    card: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    addressText: { fontSize: 12, color: '#888', flex: 1 },
    priceText: { fontSize: 14, fontFamily: Fonts.bold },
    avatar: { width: 24, height: 24, borderRadius: 12, marginLeft: 6 },
    rightActionContainer: { flexDirection: 'row', height: '100%', paddingLeft: 8 },
    actionButton: { width: 70, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginLeft: 8 },
    actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },

    // --- NEW NOTE CARD STYLES ---
    noteCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    noteContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    notesPreview: {
        fontSize: 13,
        color: '#808080',
        marginTop: 2,
    },
    // --- NEW MODAL STYLES ---
    modalContainer: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 0
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    modalInput: {
        flex: 1,
        fontSize: 16,
        lineHeight: 24,
        marginTop: 20,
        fontFamily: Fonts.regular
    },
    // (Used by EditDayModal wrapper)
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: Fonts.regular
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },
    paramLabel: { fontSize: 14, color: '#666', fontFamily: Fonts.medium },
});