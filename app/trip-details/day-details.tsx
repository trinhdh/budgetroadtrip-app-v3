import { db } from '@/firebaseConfig';
import { decode } from "@googlemaps/polyline-codec";
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import MapView, { Callout, CalloutSubview, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Animated, {
    useAnimatedRef,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { GeoPoint, Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { GoogleMapsService } from '@/services/google-map-service';
import { RouteService } from '@/services/route-service';
import { TripService } from '@/services/trip-service';

import { BalancesModal } from '@/components/ui/balances-modal';
import { ExpenseDetailModal } from '@/components/ui/expense-detail-modal';

const { height: SCREEN_HEIGHT, width } = Dimensions.get('window');
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

// --- RATING HELPER ---
const RatingStars = ({ rating, count }: { rating?: number, count?: number }) => {
    if (!rating) return null;
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
            <ThemedText style={{ fontSize: 12, fontWeight: 'bold' }}>{rating}</ThemedText>
            <View style={{ flexDirection: 'row' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <IconSymbol
                        key={i}
                        name="star.fill"
                        size={10}
                        color={i <= Math.round(rating) ? "#F5A623" : "#E0E0E0"}
                    />
                ))}
            </View>
            {count && <ThemedText style={{ fontSize: 12, color: '#888' }}>({count})</ThemedText>}
        </View>
    );
};

// --- ROUTE LEG INFO COMPONENT ---
const RouteLegInfo = ({ leg }: { leg: any }) => {
    if (!leg) return null;
    const seconds = parseInt((leg.duration || "0s").replace('s', ''), 10);
    const durationMin = Math.round(seconds / 60);
    const distMiles = (leg.distanceMeters * 0.000621371).toFixed(1);
    const timeDisplay = durationMin > 60
        ? `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
        : `${durationMin} min`;

    return (
        <View style={styles.legInfoContainer}>
            <View style={styles.legPill}>
                <IconSymbol name="car" size={12} color="#666" />
                <ThemedText style={styles.legText}>
                    {timeDisplay} • {distMiles} mi
                </ThemedText>
            </View>
        </View>
    );
};

// --- Edit Day Modal ---
type EditDayModalProps = {
    visible: boolean;
    onClose: () => void;
    day: any;
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

    const [dayRouteCoordinates, setDayRouteCoordinates] = useState<GeoPoint[]>([]);
    const [dayRouteLegs, setDayRouteLegs] = useState<any[]>([]);
    const [dayStats, setDayStats] = useState({ miles: '0', time: '0h 0m' });

    const [paramsModalVisible, setParamsModalVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);
    const [balancesVisible, setBalancesVisible] = useState(false);

    const [editingDay, setEditingDay] = useState<any>(null);

    // --- TAB STATE ---
    const [activeTab, setActiveTab] = useState<'activities' | 'expenses'>('activities');

    // --- Loading State for Drag ---
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

    const routeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const translateY = useSharedValue(-SCREEN_HEIGHT * 0.55);
    const context = useSharedValue({ y: 0 });
    const listScrollY = useSharedValue(0);
    const listRef = useAnimatedRef<any>();

    const scrollHandler = useAnimatedScrollHandler((event) => {
        listScrollY.value = event.contentOffset.y;
    });

    const gesture = Gesture.Pan()
        .simultaneousWithExternalGesture(listRef)
        .onStart(() => { context.value = { y: translateY.value }; })
        .onUpdate((event) => {
            if (listScrollY.value <= 0 && event.translationY > 0) {
                translateY.value = event.translationY + context.value.y;
                translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
            } else if (listScrollY.value <= 0) {
                translateY.value = event.translationY + context.value.y;
                translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
            }
        })
        .onEnd((event) => {
            const MINIMIZED = -SCREEN_HEIGHT * 0.12;
            const HALF = -SCREEN_HEIGHT * 0.55;
            const EXPANDED = MAX_TRANSLATE_Y;

            if (event.velocityY > 500) {
                translateY.value = withSpring(MINIMIZED, { damping: 20, stiffness: 90 });
            } else if (event.velocityY < -500) {
                if (translateY.value > HALF) {
                    translateY.value = withSpring(HALF, { damping: 20, stiffness: 90 });
                } else {
                    translateY.value = withSpring(EXPANDED, { damping: 20, stiffness: 90 });
                }
            } else {
                if (translateY.value > -SCREEN_HEIGHT * 0.3) {
                    translateY.value = withSpring(MINIMIZED, { damping: 20, stiffness: 90 });
                } else if (translateY.value < -SCREEN_HEIGHT * 0.75) {
                    translateY.value = withSpring(EXPANDED, { damping: 20, stiffness: 90 });
                } else {
                    translateY.value = withSpring(HALF, { damping: 20, stiffness: 90 });
                }
            }
        });

    const rBottomSheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const closeRow = (id: string) => {
        const row = swipeableRows.current.get(id);
        if (row) row.close();
    };

    // --- FETCH TRIP DATA ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribe = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) setTrip(data);
            else { Alert.alert("Error", "Trip not found"); router.back(); }
        });
        return () => unsubscribe();
    }, [tripId]);

    // --- FETCH EXPENSES ---
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

    // --- ROUTE LOGIC ---
    useEffect(() => {
        const fetchDayRoute = async () => {
            if (!trip || !trip.itinerary || !trip.itinerary[dayIndex]) return;

            const currentDay = trip.itinerary[dayIndex];
            const timeline = (currentDay.timeline || []).sort((a: any, b: any) => a.order - b.order);

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

            if (currentDay.routePolyline && currentDay.routeStats) {
                try {
                    const points = decode(currentDay.routePolyline, 5).map(([lat, lng]) => ({
                        lat,
                        lng
                    }));
                    setDayRouteCoordinates(points);
                    setDayStats({
                        miles: currentDay.routeStats.distance,
                        time: currentDay.routeStats.duration
                    });
                    return;
                } catch (e) {
                    console.error("Failed to decode cache:", e);
                }
            }

            if (!startPoint || mapItems.length === 0) {
                setDayRouteCoordinates([]);
                setDayRouteLegs([]);
                setDayStats({ miles: '0', time: '0h 0m' });
                return;
            }

            const stops = mapItems.map((t: any) => toGeoPoint(t.coordinates)).filter((c): c is GeoPoint => !!c);
            const destination = stops[stops.length - 1];
            const waypoints = stops.slice(0, -1);

            const result = await RouteService.getRoute(startPoint, destination, waypoints);

            if (result && result.points) {
                setDayRouteCoordinates(result.points);
                setDayRouteLegs(result.legs);

                const miles = (result.totalDistanceMeters * 0.000621371).toFixed(1);
                const totalSeconds = result.totalDurationSeconds;
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const timeStr = `${hours}h ${minutes}m`;

                setDayStats({ miles, time: timeStr });

                if (result.encodedPolyline) {
                    await TripService.saveDayRoute(
                        tripId,
                        dayIndex,
                        result.encodedPolyline,
                        { distance: miles, duration: timeStr }
                    );
                }
            }
        };

        if (routeTimeout.current) clearTimeout(routeTimeout.current);
        routeTimeout.current = setTimeout(() => {
            fetchDayRoute();
        }, 1000);

        return () => {
            if (routeTimeout.current) clearTimeout(routeTimeout.current);
        };
    }, [trip, dayIndex]);

    // --- HANDLERS ---
    const handleNavigateToItem = (item: any) => {
        const coords = toLatLng(item.coordinates);
        if (!coords) {
            Alert.alert("Error", "Location coordinates not found.");
            return;
        }
        const destination = item.address ? encodeURIComponent(item.address) : `${coords.latitude},${coords.longitude}`;
        let url = Platform.OS === 'ios' ? `http://maps.apple.com/?daddr=${destination}` : `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
        Linking.openURL(url).catch(err => {
            console.error("Failed to open map:", err);
            Alert.alert("Error", "Could not open map application.");
        });
    };

    const handleOpenExternalLink = async (item: any) => {
        const exactQuery = encodeURIComponent(`${item.title}, ${item.address || ''}`);
        let url = '';

        if (item.type === 'hotel' || item.type === 'lodging') {
            let dateParams = '';
            if (trip?.startDate) {
                const checkIn = new Date(trip.startDate);
                checkIn.setDate(checkIn.getDate() + dayIndex);
                const checkOut = new Date(checkIn);
                checkOut.setDate(checkIn.getDate() + 1);
                const fmt = (d: Date) => d.toISOString().split('T')[0];

                const adults = trip.travelers?.adults || 2;
                const children = trip.travelers?.children || 0;

                dateParams = `&q-check-in=${fmt(checkIn)}&q-check-out=${fmt(checkOut)}&q-rooms=1&q-room-0-adults=${adults}&q-room-0-children=${children}`;
            }
            url = `https://www.hotels.com/search.do?q-destination=${exactQuery}${dateParams}`;
        } else {
            url = `https://www.google.com/search?q=${exactQuery}`;
        }

        try {
            await WebBrowser.openBrowserAsync(url, {
                presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC
            });
        } catch (e) {
            Alert.alert("Error", "Could not open link.");
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
        router.push({
            pathname: '/trip-details/activity',
            params: {
                tripId: tripId,
                dayIndex: dayIndex,
                activity: JSON.stringify(item)
            }
        });
    };

    const handleAddActivityPress = () => {
        router.push({
            pathname: '/trip-details/activity',
            params: { tripId: tripId, dayIndex: dayIndex }
        });
    };

    const handleEditExpensePress = (item: any) => {
        closeRow(item.id);
        router.push({
            pathname: '/trip-details/expense',
            params: { tripId: tripId, expense: JSON.stringify(item) }
        });
    };

    const handleAddExpensePress = () => {
        router.push({
            pathname: '/trip-details/expense',
            params: { tripId: tripId, expense: JSON.stringify({ day: dayIndex + 1 }) }
        });
    };

    const handleDragEnd = async ({ data }: { data: any[] }) => {
        if (!tripId || !trip) return;

        const currentTimeline = trip.itinerary[dayIndex].timeline || [];

        // CHECK: Did the order actually change?
        const hasChanged = data.some((item, index) => item.id !== currentTimeline[index]?.id);

        if (!hasChanged) return;

        setIsUpdatingOrder(true);
        // 1. Assign new order numbers
        const reorderedData = data.map((item, index) => ({ ...item, order: index + 1 }));

        // 2. CRITICAL FIX: Create a deep copy of the itinerary array
        // We must NOT mutate 'trip.itinerary' directly.
        const newItinerary = [...trip.itinerary];
        newItinerary[dayIndex] = {
            ...newItinerary[dayIndex],
            timeline: reorderedData
        };

        const updatedTrip = {
            ...trip,
            itinerary: newItinerary
        };

        // 3. Update Local State
        setTrip(updatedTrip);

        try {
            // 4. Update Backend
            await TripService.updateDayTimeline(tripId, dayIndex, reorderedData);
        } catch (e) {
            console.log("Error saving drag order", e);
            Alert.alert("Error", "Failed to update order.");
        } finally {
            setIsUpdatingOrder(false);
        }
    };

    const renderActivityItem = ({ item, getIndex, drag, isActive }: RenderItemParams<any>) => {
        const index = getIndex();
        if (index === undefined) return null;
        const { icon, color } = getCategoryDetails(item.type);

        const photoUrl = item.photo_reference ? GoogleMapsService.getPhotoUrl(item.photo_reference, 400) : null;
        const priceString = item.price_level ? '$'.repeat(item.price_level) : '';
        const displayPrice = item.price > 0 ? `$${item.price}` : priceString;
        const typeLabel = item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : 'Place';

        const mapItems = (trip?.itinerary?.[dayIndex]?.timeline || [])
            .filter((t: any) => toGeoPoint(t.coordinates))
            .sort((a: any, b: any) => a.order - b.order);

        const mapIndex = mapItems.findIndex((m: any) => m.id === item.id);
        const leg = mapIndex >= 0 ? dayRouteLegs[mapIndex] : null;

        const renderLeftActions = () => (
            <View style={styles.leftActionContainer}>
                <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: '#10B981' }]} // Green
                    onPress={() => {
                        closeRow(item.id);
                        handleNavigateToItem(item);
                    }}
                >
                    <IconSymbol name="map.fill" size={20} color="#fff" />
                    <ThemedText style={styles.actionText}>Go</ThemedText>
                </TouchableOpacity>
            </View>
        );

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
                    <ThemedText style={styles.actionText}>Del</ThemedText>
                </TouchableOpacity>
            </View>
        );

        return (
            <ScaleDecorator>
                <View style={styles.timelineWrapper}>
                    {leg && <RouteLegInfo leg={leg} />}

                    <Swipeable
                        ref={(ref) => { if (ref && item.id) swipeableRows.current.set(item.id, ref); }}
                        renderLeftActions={renderLeftActions}
                        renderRightActions={renderRightActions}
                        containerStyle={{ overflow: 'visible' }}
                    >
                        <TouchableOpacity
                            onLongPress={drag}
                            disabled={isActive}
                            style={[styles.richCard, { backgroundColor: colors.background, borderColor: colors.icon + '15' }]}
                            activeOpacity={0.9}
                            onPress={() => handleOpenExternalLink(item)}
                        >
                            {/* --- ORDER NUMBER BADGE (Instead of Hamburger) --- */}
                            <View style={{ justifyContent: 'center', alignSelf: 'center', marginRight: 12 }}>
                                <View style={[styles.numberBadge, { backgroundColor: color }]}>
                                    <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>{index + 1}</ThemedText>
                                </View>
                            </View>

                            <View style={{ flex: 1, paddingVertical: 4 }}>
                                <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ fontSize: 16 }}>
                                    {item.title}
                                </ThemedText>

                                <RatingStars rating={item.rating} count={item.user_ratings_total} />

                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                    <ThemedText style={styles.metaText}>{typeLabel}</ThemedText>
                                    {displayPrice ? (
                                        <>
                                            <View style={styles.dotSeparator} />
                                            <ThemedText style={styles.metaText}>{displayPrice}</ThemedText>
                                        </>
                                    ) : null}
                                    <IconSymbol name="arrow.up.right" size={12} color="#999" style={{ marginLeft: 6 }} />
                                </View>

                                <ThemedText style={[styles.addressText, { marginTop: 6 }]} numberOfLines={1}>
                                    {item.address || item.desc}
                                </ThemedText>

                                <TouchableOpacity
                                    style={styles.navigateButton}
                                    onPress={() => handleNavigateToItem(item)}
                                    onLongPress={() => { }} // <--- ADD THIS: Prevents triggering parent drag
                                    delayLongPress={200}   // <--- OPTIONAL: Makes it less sensitive
                                >
                                    <IconSymbol name="paperplane.fill" size={12} color="#fff" />
                                    <ThemedText style={styles.navigateButtonText}>Navigate</ThemedText>
                                </TouchableOpacity>
                            </View>

                            {photoUrl ? (
                                <Image source={{ uri: photoUrl }} style={styles.cardImage} />
                            ) : (
                                <View style={[styles.cardImagePlaceholder, { backgroundColor: color + '15' }]}>
                                    <IconSymbol name={icon as any} size={24} color={color} />
                                </View>
                            )}
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
                    <ThemedText style={styles.actionText}>Del</ThemedText>
                </TouchableOpacity>
            </View>
        );
        return (
            <View key={`${item.id}-${index}`} style={{ marginBottom: 12, paddingHorizontal: 20 }}>
                <Swipeable
                    ref={(ref) => { if (ref && item.id) swipeableRows.current.set(item.id, ref); }}
                    renderRightActions={renderRightActions}
                    containerStyle={{ overflow: 'visible' }}
                >
                    <TouchableOpacity
                        style={[styles.card, { backgroundColor: colors.background, borderColor: colors.icon + '15' }]}
                        activeOpacity={0.7}
                        // 👇 ADD THIS LINE HERE
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
                <Stack.Screen
                    options={{
                        headerShown: false,
                        gestureEnabled: true,
                        fullScreenGestureEnabled: true
                    }}
                />

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

                                // Find correct index in the original timeline to match card number
                                const listIndex = timeline.findIndex((t: any) => t.id === item.id);
                                const displayNum = listIndex >= 0 ? listIndex + 1 : idx + 1;

                                if (!coords) return null;
                                return (
                                    <Marker key={`m-${idx}-${item.id}`} coordinate={coords} title={item.title} zIndex={5}>
                                        {/* --- NUMBERED PIN --- */}
                                        <View style={[styles.markerCircle, { backgroundColor: color, borderColor: '#fff', borderWidth: 2 }]}>
                                            <ThemedText style={styles.markerNumber}>{displayNum}</ThemedText>
                                        </View>

                                        {/* --- CUSTOM CALLOUT --- */}
                                        <Callout tooltip>
                                            <View style={styles.calloutContainer}>
                                                <View style={styles.calloutCard}>
                                                    <Text style={styles.calloutTitle}>{item.title}</Text>
                                                    <Text style={styles.calloutAddress} numberOfLines={2}>
                                                        {item.address}
                                                    </Text>

                                                    {/* 👇 Button-only press */}
                                                    <CalloutSubview
                                                        onPress={() => handleNavigateToItem(item)}
                                                    >
                                                        <View style={styles.calloutButton}>
                                                            <Text style={styles.calloutButtonText}>Navigate</Text>
                                                            <IconSymbol
                                                                name="arrow.triangle.turn.up.right.diamond.fill"
                                                                size={12}
                                                                color="#fff"
                                                            />
                                                        </View>
                                                    </CalloutSubview>

                                                </View>
                                                <View style={styles.calloutArrow} />
                                            </View>
                                        </Callout>
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

                    {/* TITLE BOX */}
                    <View style={styles.headerTitleBox}>
                        <ThemedText style={styles.headerDayText}>Day {currentDay.day}</ThemedText>
                        <ThemedText style={styles.headerTitleText} numberOfLines={1}>{currentDay.title}</ThemedText>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <IconSymbol name="car" size={12} color="#ccc" />
                                <ThemedText style={{ color: '#ccc', fontSize: 12, fontWeight: '600' }}>{dayStats.miles} mi</ThemedText>
                            </View>
                            <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#666' }} />
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <IconSymbol name="clock.fill" size={12} color="#ccc" />
                                <ThemedText style={{ color: '#ccc', fontSize: 12, fontWeight: '600' }}>{dayStats.time}</ThemedText>
                            </View>
                        </View>
                    </View>

                    {/* Spacer to keep title centered since right button is gone */}
                    <View style={{ width: 40 }} />
                </View>

                {/* BOTTOM SHEET */}
                <GestureDetector gesture={gesture}>
                    <Animated.View style={[styles.sheetContainer, { backgroundColor: colors.background, top: SCREEN_HEIGHT }, rBottomSheetStyle]}>
                        <View style={styles.sheetHandleContainer}>
                            <View style={[styles.sheetHandle, { backgroundColor: colors.icon + '40' }]} />
                        </View>

                        {/* --- TAB SELECTOR --- */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'activities' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
                                onPress={() => setActiveTab('activities')}
                            >
                                <ThemedText style={[styles.tabText, activeTab === 'activities' && { color: colors.tint, fontFamily: Fonts.bold }]}>Activities</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabButton, activeTab === 'expenses' && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
                                onPress={() => setActiveTab('expenses')}
                            >
                                <ThemedText style={[styles.tabText, activeTab === 'expenses' && { color: colors.tint, fontFamily: Fonts.bold }]}>Expenses</ThemedText>
                            </TouchableOpacity>
                        </View>

                        {/* --- ACTIVITIES TAB --- */}
                        {activeTab === 'activities' && (
                            <DraggableFlatList
                                ref={listRef}
                                data={timeline}
                                onDragEnd={handleDragEnd}
                                keyExtractor={(item) => item.id}
                                renderItem={renderActivityItem}
                                contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 20 }}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                onScroll={scrollHandler}
                                scrollEventThrottle={16}
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
                                            onPress={handleAddActivityPress}
                                        >
                                            <IconSymbol name="mappin.and.ellipse" size={20} color={colors.text} />
                                            <ThemedText style={[styles.dashedButtonText, { color: colors.text }]}>Add Activity</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        )}

                        {/* --- EXPENSES TAB --- */}
                        {activeTab === 'expenses' && (
                            <Animated.FlatList
                                ref={listRef} // Attach same ref for scroll syncing if compatible, or just rely on scrollHandler
                                data={expenses}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item, index }) => renderExpenseItem({ item, index })}
                                contentContainerStyle={{ paddingBottom: 150 }}
                                showsVerticalScrollIndicator={false}
                                bounces={false}
                                onScroll={scrollHandler}
                                scrollEventThrottle={16}
                                ListHeaderComponent={
                                    expenses.length > 0 ? (
                                        <View style={[styles.sectionHeader, { paddingHorizontal: 20, marginBottom: 10 }]}>
                                            <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>Summary</ThemedText>
                                            <ThemedText style={{ color: '#FF3B30', fontWeight: 'bold', fontSize: 18 }}>
                                                -${expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toFixed(2)}
                                            </ThemedText>
                                        </View>
                                    ) : (
                                        <View style={styles.emptyState}>
                                            <IconSymbol name="banknote" size={40} color={colors.icon + '40'} />
                                            <ThemedText style={{ color: colors.icon, marginTop: 10 }}>No expenses yet.</ThemedText>
                                        </View>
                                    )
                                }
                                ListFooterComponent={
                                    <View style={[styles.footerContainer, { paddingHorizontal: 20 }]}>
                                        <TouchableOpacity
                                            style={[styles.dashedButton, { borderColor: colors.icon + '60' }]}
                                            onPress={handleAddExpensePress}
                                        >
                                            <IconSymbol name="banknote" size={20} color={colors.text} />
                                            <ThemedText style={[styles.dashedButtonText, { color: colors.text }]}>Add Expense</ThemedText>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        )}

                    </Animated.View>
                </GestureDetector>

            </ThemedView>
            <BalancesModal visible={balancesVisible} onClose={() => setBalancesVisible(false)} debts={[]} currentUser="u1" onSettle={() => { }} />
            <ExpenseDetailModal visible={!!selectedExpense} onClose={() => setSelectedExpense(null)} expense={selectedExpense} />
            <EditDayModal
                visible={!!editingDay}
                onClose={() => setEditingDay(null)}
                day={editingDay}
                onSave={(dayIndex, newTitle) => {
                    // Logic to save day title if needed
                }}
            />
            <BottomSheetModal
                isVisible={paramsModalVisible}
                onClose={() => setParamsModalVisible(false)}
                title="Trip Details"
                height="65%"
            >
                <View>
                    {/* Trip details content */}
                </View>
            </BottomSheetModal>

            {/* --- BLOCKING LOADING MODAL --- */}
            <Modal transparent visible={isUpdatingOrder} animationType="fade">
                <View style={styles.processingOverlay}>
                    <View style={[styles.processingBox, { backgroundColor: colors.background }]}>
                        <ActivityIndicator size="large" color={colors.tint} />
                        <ThemedText style={{ marginTop: 12, fontWeight: '600' }}>Updating Itinerary...</ThemedText>
                    </View>
                </View>
            </Modal>

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

    // --- TAB STYLES ---
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 10 },
    tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    tabText: { fontSize: 16, color: '#666', fontFamily: Fonts.medium },

    timelineWrapper: { marginBottom: 20 },
    card: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, padding: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
    cardContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    cardIconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    priceText: { fontSize: 14, fontFamily: Fonts.bold },
    avatar: { width: 24, height: 24, borderRadius: 12, marginLeft: 6 },
    dragHandle: { marginTop: 0 },
    richCard: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start', // Top align
        borderRadius: 16,
        borderWidth: 1,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 3,
        gap: 12,
        minHeight: 100
    },
    cardImage: {
        width: 80,
        height: 80,
        borderRadius: 12,
        backgroundColor: '#eee'
    },
    cardImagePlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    metaText: {
        fontSize: 12,
        color: '#666',
        fontFamily: Fonts.medium
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#999',
        marginHorizontal: 6
    },
    openStatus: {
        fontSize: 12,
        fontWeight: 'bold',
        marginTop: 4
    },
    addressText: {
        fontSize: 12,
        color: '#888',
        flex: 1
    },
    leftActionContainer: { flexDirection: 'row', height: '100%', paddingRight: 8 },
    rightActionContainer: { flexDirection: 'row', height: '100%', paddingLeft: 8 },
    actionButton: { width: 70, height: '100%', justifyContent: 'center', alignItems: 'center', borderRadius: 16, marginLeft: 8 },
    actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4 },
    emptyState: { alignItems: 'center', padding: 30 },
    footerContainer: { gap: 12, marginTop: 10, paddingBottom: 100 },
    expensesSection: { marginTop: 10, marginBottom: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    dashedButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed' },
    dashedButtonText: { fontSize: 16, fontFamily: Fonts.medium },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        fontFamily: Fonts.regular,
    },
    saveButton: {
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    paramLabel: {
        fontSize: 14,
        color: '#666',
        fontFamily: Fonts.medium,
        marginBottom: 4,
    },
    // --- STYLES FOR LOADING MODAL ---
    processingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    processingBox: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    // --- CALLOUT STYLES ---
    calloutContainer: {
        width: 200,
        backgroundColor: 'transparent',
        alignItems: 'center',
    },
    calloutCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5,
        alignItems: 'center',
    },
    calloutTitle: {
        fontSize: 14,
        fontFamily: Fonts.bold,
        color: '#333',
        marginBottom: 4,
        textAlign: 'center',
    },
    calloutAddress: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        marginBottom: 8,
    },
    calloutButton: {
        backgroundColor: '#10B981', // Green like the 'Go' button in swipe
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    calloutButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    calloutArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff', // Match card background
        marginTop: -1, // Overlap slightly
    },
    // --- MARKER STYLES ---
    markerCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4
    },
    markerNumber: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    // --- LIST BADGE ---
    numberBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // --- LEG INFO ---
    legInfoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        marginTop: -8,
    },

    legPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    legText: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
    },
    // --- CARD BUTTON ---
    navigateButton: {
        marginTop: 10,
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignSelf: 'flex-start',
        gap: 6
    },
    navigateButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold'
    },
});