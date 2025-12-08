// trinhdh/budgetroadtrip-app-v3/budgetroadtrip-app-v3-develop/app/trip-details/[id].tsx

import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- SERVICE & CONTEXT ---
import { Trip } from '@/constants/types';
import { useAuth } from '@/context/AuthContext';
import { TripService } from '@/services/trip-service';

// --- COMPONENTS ---
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// --- MODALS ---
import { AddExpenseModal } from '@/components/ui/add-expense-modal';
import { AllExpensesModal } from '@/components/ui/all-expense-modal';
import { BalancesModal } from '@/components/ui/balances-modal';
import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { ExpenseDetailModal } from '@/components/ui/expense-detail-modal';
import { SwipeableExpenseRow } from '@/components/ui/swipeable-expense-row';

const { width, height } = Dimensions.get('window');
const PARALLAX_HEADER_HEIGHT = 400;

export default function TripDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const tripId = Array.isArray(id) ? id[0] : id;

    const { user } = useAuth();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    // --- STATE ---
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<any[]>([]);

    const [balancesVisible, setBalancesVisible] = useState(false);
    const [paramsModalVisible, setParamsModalVisible] = useState(false);
    const [addExpenseVisible, setAddExpenseVisible] = useState(false);
    const [viewAllExpensesVisible, setViewAllExpensesVisible] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<any>(null);

    // --- 1. FETCH TRIP ---
    useEffect(() => {
        if (!tripId) return;
        const unsubscribeTrip = TripService.subscribeToTrip(tripId, (data) => {
            setLoading(false);
            if (data) {
                setTrip(data);
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

    // Calculate Total Spent
    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    }, [expenses]);

    const budgetPercent = trip ? (totalSpent / trip.budget) * 100 : 0;
    const isOverBudget = trip && totalSpent > trip.budget;
    const isNearBudget = !isOverBudget && budgetPercent >= 90;

    // --- ACTIONS ---

    const handleShare = async () => {
        try {
            const message = trip
                ? `Check out my trip to ${trip.destination}! Budget: $${trip.budget}`
                : "Check out my trip plan!";
            await Share.share({ message, title: 'Trip Details' });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleSaveExpense = async (data: any) => {
        if (!tripId || !user) return;

        try {
            const newExpense = {
                ...data,
                amount: parseFloat(data.amount),
                createdAt: new Date(),
                addedBy: {
                    uid: user.uid,
                    name: user.displayName || user.email?.split('@')[0] || 'Traveler',
                    avatar: user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'Traveler'}&background=random`
                },
                hasReceipt: !!data.receiptImage
            };

            await TripService.addExpense(tripId, newExpense);
            Alert.alert("Success", "Expense added!");
        } catch (error) {
            Alert.alert("Error", "Failed to add expense.");
        }
    };

    const handleDeleteExpense = async (expenseId: string) => {
        if (!tripId) return;
        try {
            const expenseToDelete = expenses.find(e => e.id === expenseId);
            const amount = expenseToDelete ? Number(expenseToDelete.amount) : 0;
            await TripService.deleteExpense(tripId, expenseId, amount);
        } catch (error) {
            Alert.alert("Error", "Failed to delete expense.");
        }
    };

    const handleSettleDebt = async (debt: any) => {
        if (!tripId || !user) return;

        const settlementExpense = {
            title: 'Settlement',
            category: 'Other',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            amount: debt.amount,
            paidBy: debt.from.id,
            splitBy: [debt.to.id],
            addedBy: {
                uid: user.uid,
                name: user.displayName || 'Traveler',
                avatar: user.photoURL || ''
            },
            isSettlement: true,
            hasReceipt: false,
            day: 0,
            receiptImage: undefined,
            createdAt: new Date()
        };

        try {
            await TripService.addExpense(tripId, settlementExpense);
            Alert.alert("Success", "Payment recorded!");
        } catch (error) {
            Alert.alert("Error", "Could not settle debt.");
        }
    };

    // --- MAP LOGIC ---
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

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.tint} />
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ThemedText>Trip not found.</ThemedText>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: colors.tint }}>Go Back</ThemedText>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                {/* BACKGROUND MAP */}
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
                        // Focus on Origin if available, otherwise first stop
                        initialRegion={{
                            latitude: trip.originCoordinates?.latitude || trip.itinerary?.[0]?.stopLocation.latitude || 37.78825,
                            longitude: trip.originCoordinates?.longitude || trip.itinerary?.[0]?.stopLocation.longitude || -122.4324,
                            latitudeDelta: 8.0,
                            longitudeDelta: 8.0,
                        }}
                        scrollEnabled={isMapMaximized}
                        zoomEnabled={isMapMaximized}
                    >
                        {/* 1. ROUTE LINE: Connect Origin -> Day 1 -> Day 2... */}
                        {trip.itinerary && trip.itinerary.length > 0 && (
                            <Polyline
                                coordinates={[
                                    // Start at Origin (if available)
                                    ...(trip.originCoordinates ? [trip.originCoordinates] : []),
                                    ...trip.itinerary.map(day => day.stopLocation)
                                ]}
                                strokeColor={colors.tint}
                                strokeWidth={3}
                                lineDashPattern={[1]}
                            />
                        )}

                        {/* 2. START MARKER */}
                        {trip.originCoordinates && (
                            <Marker
                                coordinate={trip.originCoordinates}
                                title={`Start: ${trip.origin}`}
                                zIndex={10}
                            >
                                <View style={[styles.dayMarkerPill, { backgroundColor: '#333', borderColor: '#fff' }]}>
                                    <Text style={styles.dayMarkerText}>START</Text>
                                </View>
                                {/* Triangle Arrow */}
                                <View style={[styles.markerArrow, { borderTopColor: '#333' }]} />
                            </Marker>
                        )}

                        {/* 3. DAY MARKERS (Existing) */}
                        {trip.itinerary?.map((day, index) => (
                            <Marker
                                key={day.day}
                                coordinate={day.stopLocation}
                                title={day.title}
                            >
                                <View style={[styles.dayMarkerPill, { backgroundColor: colors.tint }]}>
                                    <Text style={styles.dayMarkerText}>Day {index + 1}</Text>
                                </View>
                                <View style={[styles.markerArrow, { borderTopColor: colors.tint }]} />
                            </Marker>
                        ))}
                    </MapView>

                    {!isMapMaximized && (
                        <LinearGradient
                            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
                    )}

                    {/* MAXIMIZED UI */}
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
                                    data={trip.itinerary}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    snapToInterval={width * 0.8 + 15}
                                    decelerationRate="fast"
                                    contentContainerStyle={{ paddingHorizontal: 20 }}
                                    keyExtractor={(item) => item.day.toString()}
                                    onViewableItemsChanged={onViewableItemsChanged}
                                    viewabilityConfig={viewabilityConfig}
                                    renderItem={({ item, index }) => (
                                        <TouchableOpacity
                                            style={styles.mapCard}
                                            onPress={() => setIsMapMaximized(false)}
                                            activeOpacity={0.9}
                                        >
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.mapCardTitle}>Day {index + 1}: {item.title}</Text>
                                                <Text style={styles.mapCardSubtitle}>{item.distance} driving</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
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
                                style={[
                                    styles.glassPill,
                                    isOverBudget && { backgroundColor: '#FF3B30' },
                                    isNearBudget && { backgroundColor: '#FF9500' }
                                ]}
                                onPress={() => setParamsModalVisible(true)}
                                activeOpacity={0.7}
                            >
                                <IconSymbol name="dollarsign" size={16} color="#fff" style={{ marginRight: 2 }} />
                                <ThemedText style={styles.budgetText}>~{Math.round(trip.estimatedCost)}</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* SCROLL CONTENT */}
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
                            <ThemedText style={styles.destinationTitle}>{trip.destination}</ThemedText>
                            <View style={styles.subtitleRow}>
                                <IconSymbol name="paperplane.fill" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>From {trip.origin}</ThemedText>
                                <View style={styles.dotSeparator} />
                                <IconSymbol name="calendar" size={14} color="#666" />
                                <ThemedText style={styles.subtitleText}>
                                    {trip.startDate ? new Date(trip.startDate).toLocaleDateString() : 'TBD'}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Budget Breakdown */}
                        <View style={styles.section}>
                            <ThemedText type="subtitle" style={styles.sectionTitle}>Budget Breakdown</ThemedText>
                            <View style={styles.budgetGrid}>
                                {trip.budgetBreakdown?.map((item, index) => (
                                    <View key={index} style={[styles.budgetCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
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
                                <ThemedText type="subtitle" style={[styles.sectionTitle, { marginBottom: 0 }]}>
                                    Recent Expenses
                                </ThemedText>

                                <View style={{ flexDirection: 'row', gap: 15 }}>
                                    <TouchableOpacity onPress={() => setBalancesVisible(true)}>
                                        <ThemedText style={{ color: colors.tint, fontFamily: Fonts.medium, fontSize: 14 }}>Settle Up</ThemedText>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setViewAllExpensesVisible(true)}>
                                        <ThemedText style={{ color: colors.tint, fontFamily: Fonts.medium, fontSize: 14 }}>View All</ThemedText>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {(isOverBudget || isNearBudget) && (
                                <View style={[styles.warningBanner, { backgroundColor: isOverBudget ? '#FFEBEE' : '#FFF3E0' }]}>
                                    <IconSymbol name="exclamationmark.triangle.fill" size={18} color={isOverBudget ? '#C62828' : '#EF6C00'} />
                                    <ThemedText style={[styles.warningText, { color: isOverBudget ? '#C62828' : '#EF6C00' }]}>
                                        {isOverBudget
                                            ? `Over Budget by $${(totalSpent - trip.budget).toFixed(0)}!`
                                            : `Approaching limit: ${budgetPercent.toFixed(0)}% spent`
                                        }
                                    </ThemedText>
                                </View>
                            )}

                            {expenses.length > 0 && (
                                <View style={[styles.expensesContainer, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
                                    {expenses.slice(0, 3).map((item, index) => (
                                        <View key={item.id}>
                                            <SwipeableExpenseRow
                                                item={item}
                                                onPress={setSelectedExpense}
                                                onDelete={handleDeleteExpense}
                                            />
                                            {index < Math.min(expenses.length, 3) - 1 && (
                                                <View style={{ height: 1, backgroundColor: colors.icon + '10' }} />
                                            )}
                                        </View>
                                    ))}
                                </View>
                            )}

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
                            {trip.itinerary?.map((day, index) => (
                                <TouchableOpacity
                                    key={day.day}
                                    onPress={() => router.push({
                                        pathname: '/trip-details/day-details',
                                        params: { tripId: trip.id, dayIndex: index }
                                    })}
                                    style={[styles.dayCard, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}
                                >
                                    <View style={[styles.dayBadge, { backgroundColor: colors.tint + '20' }]}>
                                        <ThemedText style={[styles.dayNumber, { color: colors.tint }]}>Day {index + 1}</ThemedText>
                                    </View>
                                    <View style={styles.dayContent}>
                                        <ThemedText type="defaultSemiBold">{day.title}</ThemedText>
                                        <ThemedText style={styles.grayText}>{day.distance}</ThemedText>
                                    </View>
                                    <IconSymbol name="chevron.right" size={20} color={colors.icon} />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </Animated.ScrollView>

                {/* --- MODALS --- */}
                <BalancesModal
                    visible={balancesVisible}
                    onClose={() => setBalancesVisible(false)}
                    debts={[]}
                    currentUser="u1"
                    onSettle={handleSettleDebt}
                />
                <AddExpenseModal
                    visible={addExpenseVisible}
                    onClose={() => setAddExpenseVisible(false)}
                    itineraryDays={trip.itinerary || []}
                    onSave={handleSaveExpense}
                />
                <AllExpensesModal
                    visible={viewAllExpensesVisible}
                    onClose={() => setViewAllExpensesVisible(false)}
                    expenses={expenses}
                    onSelectExpense={setSelectedExpense}
                    onDeleteExpense={handleDeleteExpense}
                />
                <ExpenseDetailModal
                    visible={!!selectedExpense}
                    onClose={() => setSelectedExpense(null)}
                    expense={selectedExpense}
                />
                <BottomSheetModal isVisible={paramsModalVisible} onClose={() => setParamsModalVisible(false)} title="Trip Parameters" height="50%">
                    <ThemedText style={styles.modalSubtitle}>Trip Details</ThemedText>
                    <View style={styles.paramRow}>
                        <ThemedText style={styles.paramLabel}>My Budget Limit</ThemedText>
                        <ThemedText style={styles.paramValue}>${trip.budget}</ThemedText>
                    </View>
                    <View style={styles.paramSeparator} />
                    <View style={styles.paramRow}>
                        <ThemedText style={styles.paramLabel}>AI Estimated Cost</ThemedText>
                        <ThemedText style={styles.paramValue}>~${Math.round(trip.estimatedCost)}</ThemedText>
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