import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Platform,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// NOTE: Make sure to wrap your App root with GestureHandlerRootView for Swipeable to work!
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// --- Custom Components ---
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- Modals (New Paths) ---
import { AddExpenseModal } from '@/components/ui/add-expense-modal';
import { AllExpensesModal } from '@/components/ui/all-expense-modal';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { ExpenseDetailModal } from '@/components/ui/expense-detail-modal';
import { SwipeableExpenseRow } from '@/components/ui/swipeable-expense-row'; // Import Row

const { width, height } = Dimensions.get('window');
const PARALLAX_HEADER_HEIGHT = 400;

// --- MOCK DATA ---
const TRIP = {
    id: '1',
    destination: 'New York City',
    origin: 'Atlanta',
    dates: 'Dec 01 - Dec 05',
    totalBudget: 1500,
    spent: 1240,
    travelers: 2,
    vehicle: 'Sedan (30 mpg)',
    budgetType: 'Manual',
    image: 'https://images.unsplash.com/photo-1605833556294-ea5c7a74f57d?q=80&w=1000&auto=format&fit=crop',

    originCoords: { latitude: 33.7490, longitude: -84.3880 },
    destCoords: { latitude: 40.7128, longitude: -74.0060 },

    budgetBreakdown: [
        { id: 1, category: 'Fuel', amount: 150, icon: 'speedometer', color: '#FF9F1C' },
        { id: 2, category: 'Hotel', amount: 600, icon: 'house.fill', color: '#2EC4B6' },
        { id: 3, category: 'Food', amount: 350, icon: 'leaf', color: '#E71D36' },
        { id: 4, category: 'Activities', amount: 140, icon: 'wand.and.stars', color: '#7209B7' },
    ],

    itinerary: [
        {
            day: 1,
            title: 'Departure -> Richmond',
            distance: '450 mi',
            color: '#FF9F1C',
            path: [{ latitude: 33.7490, longitude: -84.3880 }, { latitude: 35.2271, longitude: -80.8431 }, { latitude: 37.5407, longitude: -77.4360 }],
            stopLocation: { latitude: 37.5407, longitude: -77.4360 }
        },
        {
            day: 2,
            title: 'Richmond -> NYC',
            distance: '420 mi',
            color: '#2EC4B6',
            path: [{ latitude: 37.5407, longitude: -77.4360 }, { latitude: 38.9072, longitude: -77.0369 }, { latitude: 39.9526, longitude: -75.1652 }, { latitude: 40.7128, longitude: -74.0060 }],
            stopLocation: { latitude: 39.9526, longitude: -75.1652 }
        },
        {
            day: 3,
            title: 'Manhattan Exploration',
            distance: '10 mi',
            color: '#7209B7',
            path: [{ latitude: 40.7128, longitude: -74.0060 }, { latitude: 40.7580, longitude: -73.9855 }, { latitude: 40.7829, longitude: -73.9654 }],
            stopLocation: { latitude: 40.7580, longitude: -73.9855 }
        },
    ]
};

const INITIAL_EXPENSES = [
    {
        id: '101', title: 'Shell Gas Station', amount: 45.50, date: 'Dec 01', category: 'Fuel', hasReceipt: true, day: 1,
        addedBy: { name: 'Alex', avatar: 'https://ui-avatars.com/api/?name=Alex&background=FF9F1C&color=fff' },
        receiptImage: 'https://templates.invoicehome.com/receipt-template-us-neat-750px.png'
    },
    {
        id: '102', title: 'Starbucks Coffee', amount: 12.25, date: 'Dec 02', category: 'Food', hasReceipt: false, day: 2,
        addedBy: { name: 'Sam', avatar: 'https://ui-avatars.com/api/?name=Sam&background=2EC4B6&color=fff' }
    },
    {
        id: '103', title: 'Museum Ticket', amount: 25.00, date: 'Dec 02', category: 'Activities', hasReceipt: true, day: 2,
        addedBy: { name: 'Alex', avatar: 'https://ui-avatars.com/api/?name=Alex&background=FF9F1C&color=fff' }
    },
];

export default function TripDetailsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    // --- STATE ---
    const [expenses, setExpenses] = useState(INITIAL_EXPENSES);

    // Calculate Total Spent
    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, item) => sum + (typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount), 0);
    }, [expenses]);

    const budgetPercent = (totalSpent / TRIP.totalBudget) * 100;
    const isOverBudget = totalSpent > TRIP.totalBudget;
    const isNearBudget = !isOverBudget && budgetPercent >= 90;

    // Modals
    const [paramsModalVisible, setParamsModalVisible] = useState(false);
    const [addExpenseVisible, setAddExpenseVisible] = useState(false);
    const [viewAllExpensesVisible, setViewAllExpensesVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);

    // --- ACTIONS ---

    const handleSaveExpense = (data: any) => {
        const newExpense = {
            ...data,
            id: Math.random().toString(),
            addedBy: { name: 'You', avatar: 'https://ui-avatars.com/api/?name=You&background=333&color=fff' },
            hasReceipt: !!data.receiptImage
        };

        const newTotal = totalSpent + parseFloat(data.amount);

        if (newTotal > TRIP.totalBudget) {
            Alert.alert("Budget Exceeded!", `This pushes total to $${newTotal.toFixed(2)}.`);
        } else if (newTotal >= TRIP.totalBudget * 0.9) {
            Alert.alert("Budget Warning", `You are at ${((newTotal / TRIP.totalBudget) * 100).toFixed(0)}% of budget.`);
        } else {
            Alert.alert("Success", "Expense added!");
        }

        setExpenses(prev => [newExpense, ...prev]);
    };

    const handleDeleteExpense = (expenseId: string) => {
        setExpenses(prev => prev.filter(ex => ex.id !== expenseId));
        // Optional: Alert.alert("Deleted", "The expense has been removed.");
    };

    // --- MAP & SCROLL LOGIC ---
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

    const handleShare = async () => {
        try {
            await Share.share({ message: `Check out my trip to ${TRIP.destination}!`, title: `Trip to ${TRIP.destination}` });
        } catch (error: any) { Alert.alert(error.message); }
    };

    const focusOnDay = useCallback((day: typeof TRIP.itinerary[0]) => {
        if (mapRef.current && day.stopLocation) {
            mapRef.current.animateToRegion({
                latitude: day.stopLocation.latitude,
                longitude: day.stopLocation.longitude,
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* --- BACKGROUND MAP --- */}
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
                        initialRegion={{
                            latitude: 37.5,
                            longitude: -79.0,
                            latitudeDelta: 12.0,
                            longitudeDelta: 12.0,
                        }}
                        scrollEnabled={isMapMaximized}
                        zoomEnabled={isMapMaximized}
                        pitchEnabled={isMapMaximized}
                        rotateEnabled={isMapMaximized}
                    >
                        {TRIP.itinerary.map((day) => (
                            <React.Fragment key={day.day}>
                                <Polyline coordinates={day.path} strokeColor={day.color} strokeWidth={5} />
                                <Marker
                                    coordinate={day.stopLocation}
                                    anchor={{ x: 0.5, y: 1 }}
                                    onPress={(e) => {
                                        if (!isMapMaximized) {
                                            e.stopPropagation();
                                            router.push('/trip-details/day-details');
                                        } else {
                                            focusOnDay(day);
                                        }
                                    }}
                                >
                                    <View style={[styles.dayMarkerPill, { backgroundColor: day.color }]}>
                                        <Text style={styles.dayMarkerText}>Day {day.day}</Text>
                                    </View>
                                    <View style={[styles.markerArrow, { borderTopColor: day.color }]} />
                                </Marker>
                            </React.Fragment>
                        ))}
                        <Marker coordinate={TRIP.originCoords} title={TRIP.origin} />
                        <Marker coordinate={TRIP.destCoords} title={TRIP.destination} />
                    </MapView>

                    {!isMapMaximized && (
                        <LinearGradient
                            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    )}

                    {/* --- MAXIMIZED UI --- */}
                    {isMapMaximized && (
                        <>
                            <TouchableOpacity
                                style={[styles.closeMapButton, { top: insets.top + 10 }]}
                                onPress={toggleMapMaximize}
                            >
                                <IconSymbol name="xmark" size={20} color="#333" />
                            </TouchableOpacity>

                            <View style={[styles.carouselContainer, { paddingBottom: insets.bottom + 20 }]}>
                                <FlatList
                                    data={TRIP.itinerary}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={width * 0.8 + 15}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                    keyExtractor={(item) => item.day.toString()}
                                    onViewableItemsChanged={onViewableItemsChanged}
                                    viewabilityConfig={viewabilityConfig}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.mapCard}
                                            onPress={() => {
                                                setIsMapMaximized(false);
                                                router.push('/trip-details/day-details');
                                            }}
                                            activeOpacity={0.9}
                                        >
                                            <View style={[styles.dayBadgeSmall, { backgroundColor: item.color }]}>
                                                <Text style={styles.dayBadgeText}>Day {item.day}</Text>
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mapCardTitle}>{item.title}</Text>
                                                <Text style={styles.mapCardSubtitle}>{item.distance} driving</Text>
                                            </View>
                                            <View style={styles.cardArrow}>
                                                <IconSymbol name="chevron.right" size={16} color="#999" />
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </>
                    )}
                </Animated.View>

                {/* --- NAVBAR --- */}
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
                                style={[
                                    styles.glassPill,
                                    isOverBudget && { backgroundColor: '#FF3B30' },
                                    isNearBudget && { backgroundColor: '#FF9500' }
                                ]}
                                onPress={() => setParamsModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <IconSymbol name="dollarsign" size={16} color="#fff" style={{ marginRight: 2 }} />
                                <ThemedText style={styles.budgetText}>{TRIP.totalBudget}</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* --- CONTENT SCROLL --- */}
                <Animated.ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    scrollEventThrottle={16}
                    onScroll={Animated.event(
                        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                        { useNativeDriver: true }
                    )}
                    style={[styles.scrollView, { opacity: isMapMaximized ? 0 : 1 }]}
                    pointerEvents={isMapMaximized ? "none" : "box-none"}
                >
                    <View style={{ height: PARALLAX_HEADER_HEIGHT - 60 }} pointerEvents="none" />

                    <View style={[styles.bodyContainer, { backgroundColor: colors.background }]} pointerEvents="auto">

                        <View style={styles.titleSection}>
                            <ThemedText style={styles.tripLabel}>Trip to</ThemedText>
                            <ThemedText style={styles.destinationTitle}>{TRIP.destination}</ThemedText>
                            <View style={styles.subtitleRow}>
                                <IconSymbol name="paperplane.fill" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>From {TRIP.origin}</ThemedText>
                                <View style={styles.dotSeparator} />
                                <IconSymbol name="calendar" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>{TRIP.dates}</ThemedText>
                            </View>
                        </View>

                        {/* Budget Breakdown */}
                        <View style={styles.section}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Budget Breakdown</ThemedText>
                            <View style={styles.budgetGrid}>
                                {TRIP.budgetBreakdown.map((item) => (
                                    <View key={item.id} style={[styles.budgetCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                                        <View style={[styles.iconCircle, { backgroundColor: item.color + '15' }]}>
                                            <IconSymbol name={item.icon as any} size={20} color={item.color} />
                                        </View>
                                        <View>
                                            <ThemedText style={styles.budgetAmount}>${item.amount}</ThemedText>
                                            <ThemedText style={styles.budgetLabel}>{item.category}</ThemedText>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Recent Expenses Section */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText type="subtitle" style={styles.sectionTitle}>Recent Expenses</ThemedText>
                                <TouchableOpacity onPress={() => setViewAllExpensesVisible(true)}>
                                    <ThemedText style={{ color: colors.tint, fontFamily: Fonts.medium, fontSize: 14 }}>View All</ThemedText>
                                </TouchableOpacity>
                            </View>

                            {(isOverBudget || isNearBudget) && (
                                <View style={[styles.warningBanner, { backgroundColor: isOverBudget ? '#FFEBEE' : '#FFF3E0' }]}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={18} color={isOverBudget ? '#C62828' : '#EF6C00'} />
                                    <ThemedText style={[styles.warningText, { color: isOverBudget ? '#C62828' : '#EF6C00' }]}>
                                        {isOverBudget
                                            ? `Over Budget by $${(totalSpent - TRIP.totalBudget).toFixed(0)}!`
                                            : `Approaching limit: ${budgetPercent.toFixed(0)}% spent`
                                        }
                                    </ThemedText>
                                </View>
                            )}

                            <View style={[styles.expensesContainer, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                                {expenses.slice(0, 3).map((item, index) => (
                                    <View key={item.id}>
                                        <SwipeableExpenseRow
                                            item={item}
                                            onPress={setSelectedExpense}
                                            onDelete={handleDeleteExpense}
                                        />
                                        {/* Divider logic handled in row or container borders */}
                                        {index < 2 && <View style={{ height: 1, backgroundColor: colors.icon + '10' }} />}
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                onPress={() => setAddExpenseVisible(true)}
                                style={[
                                    styles.addItemButton,
                                    { borderColor: colors.icon + '40', marginTop: 16 }
                                ]}
                            >
                                <IconSymbol name="plus" size={20} color={colors.text} />
                                <ThemedText style={styles.addItemText}>Add Expense</ThemedText>
                            </TouchableOpacity>

                        </View>

                        {/* Itinerary */}
                        <View style={styles.section}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Itinerary</ThemedText>
                            {TRIP.itinerary.map((day) => (
                                <TouchableOpacity key={day.day} onPress={() => router.push('/trip-details/day-details')} style={[styles.dayCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                                    <View style={[styles.dayBadge, { backgroundColor: day.color + '20' }]}>
                                        <ThemedText style={[styles.dayNumber, { color: day.color }]}>Day {day.day}</ThemedText>
                                    </View>
                                    <View style={styles.dayContent}>
                                        <ThemedText type="defaultSemiBold">{day.title}</ThemedText>
                                        <ThemedText style={styles.grayText}>{day.distance} driving</ThemedText>
                                    </View>
                                    <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Animated.ScrollView>

                {/* --- MODALS --- */}
                <AddExpenseModal visible={addExpenseVisible} onClose={() => setAddExpenseVisible(false)} itineraryDays={TRIP.itinerary} onSave={handleSaveExpense} />
                <AllExpensesModal visible={viewAllExpensesVisible} onClose={() => setViewAllExpensesVisible(false)} expenses={expenses} onSelectExpense={setSelectedExpense} onDeleteExpense={handleDeleteExpense} />
                <ExpenseDetailModal visible={!!selectedExpense} onClose={() => setSelectedExpense(null)} expense={selectedExpense} />
                <BottomSheetModal isVisible={paramsModalVisible} onClose={() => setParamsModalVisible(false)} title="Trip Parameters" height="50%">
                    <ThemedText style={styles.modalSubtitle}>This is the data you submitted to generate this plan.</ThemedText>
                    <View style={styles.paramRow}>
                        <ThemedText style={styles.paramLabel}>Budget</ThemedText>
                        <ThemedText style={styles.paramValue}>${TRIP.totalBudget}</ThemedText>
                    </View>
                    <View style={styles.paramSeparator} />
                    <View style={styles.paramRow}>
                        <ThemedText style={styles.paramLabel}>Total Spent</ThemedText>
                        <ThemedText style={[styles.paramValue, isOverBudget && { color: '#FF3B30' }]}>
                            ${totalSpent.toFixed(2)}
                        </ThemedText>
                    </View>
                </BottomSheetModal>
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
    destinationTitle: { fontSize: 32, fontFamily: Fonts.bold, marginBottom: 10, color: '#1a1a1a' },
    subtitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    subtitleText: { color: '#666', fontSize: 15, fontFamily: Fonts.medium },
    dotSeparator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#ccc', marginHorizontal: 4 },
    dayMarkerPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
    markerArrow: { width: 0, height: 0, backgroundColor: 'transparent', borderStyle: 'solid', borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', alignSelf: 'center', marginTop: -2 },
    dayMarkerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    section: { paddingHorizontal: 20, marginBottom: 24 },
    sectionTitle: { fontSize: 18, marginBottom: 12, color: '#111' },
    budgetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    budgetCard: { width: '48%', padding: 16, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    budgetAmount: { fontSize: 16, fontFamily: Fonts.bold },
    budgetLabel: { fontSize: 12, color: '#808080' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    expensesContainer: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
    dayCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    dayBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 12 },
    dayNumber: { fontFamily: Fonts.bold, fontSize: 14 },
    dayContent: { flex: 1 },
    grayText: { color: '#808080', fontSize: 13, marginTop: 2 },
    modalSubtitle: { fontSize: 14, color: '#808080', marginBottom: 24 },
    paramRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    paramLabel: { fontSize: 16, color: '#666', fontFamily: Fonts.medium },
    paramValue: { fontSize: 16, fontFamily: Fonts.bold },
    paramSeparator: { height: 1, backgroundColor: '#F0F0F0' }
});