import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width, height } = Dimensions.get('window');

// --- MOCK DATA ---
const TRIP = {
    id: '1',
    destination: 'New York City',
    origin: 'Atlanta',
    dates: 'Dec 01 - Dec 05',
    totalBudget: 1500,
    spent: 1240,
    travelers: 2, // Added travelers
    vehicle: 'Sedan (30 mpg)', // Added vehicle info
    budgetType: 'Manual', // Added budget type
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
            path: [
                { latitude: 33.7490, longitude: -84.3880 },
                { latitude: 35.2271, longitude: -80.8431 },
                { latitude: 37.5407, longitude: -77.4360 },
            ],
            stopLocation: { latitude: 37.5407, longitude: -77.4360 }
        },
        {
            day: 2,
            title: 'Richmond -> NYC',
            distance: '420 mi',
            color: '#2EC4B6',
            path: [
                { latitude: 37.5407, longitude: -77.4360 },
                { latitude: 38.9072, longitude: -77.0369 },
                { latitude: 39.9526, longitude: -75.1652 },
                { latitude: 40.7128, longitude: -74.0060 },
            ],
            stopLocation: { latitude: 39.9526, longitude: -75.1652 }
        },
        {
            day: 3,
            title: 'Manhattan Exploration',
            distance: '10 mi',
            color: '#7209B7',
            path: [
                { latitude: 40.7128, longitude: -74.0060 },
                { latitude: 40.7580, longitude: -73.9855 },
                { latitude: 40.7829, longitude: -73.9654 },
            ],
            stopLocation: { latitude: 40.7580, longitude: -73.9855 }
        },
    ]
};

export default function TripDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();

    // State for the Details Modal
    const [modalVisible, setModalVisible] = useState(false);

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* --- HEADER --- */}
            <View style={styles.headerContainer}>
                <Image source={{ uri: TRIP.image }} style={styles.headerImage} contentFit="cover" />
                <LinearGradient
                    colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
                    style={styles.gradientOverlay}
                />

                <View style={[styles.navBar, { top: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.glassButton}>
                        <IconSymbol name="chevron.left" size={24} color="#fff" />
                    </TouchableOpacity>

                    {/* CLICKABLE INFO PILL */}
                    <TouchableOpacity
                        style={styles.glassPill}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <IconSymbol name="person.2.fill" size={18} color="#fff" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.budgetText}>{TRIP.travelers} Travelers</ThemedText>
                    </TouchableOpacity>
                </View>

                <View style={styles.titleWrapper}>
                    <ThemedText style={styles.tripLabel}>Trip to</ThemedText>
                    <ThemedText style={styles.destinationTitle}>{TRIP.destination}</ThemedText>

                    <View style={styles.subtitleRow}>
                        <IconSymbol name="paperplane.fill" size={14} color="rgba(255,255,255,0.8)" />
                        <ThemedText style={styles.subtitleText}>From {TRIP.origin}</ThemedText>
                        <View style={styles.dotSeparator} />
                        <IconSymbol name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                        <ThemedText style={styles.subtitleText}>{TRIP.dates}</ThemedText>
                    </View>
                </View>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                style={styles.scrollView}
            >
                {/* Map Section */}
                <View style={styles.mapSection}>
                    <View style={styles.mapContainer}>
                        <MapView
                            style={styles.map}
                            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                            initialRegion={{
                                latitude: 37.5,
                                longitude: -79.0,
                                latitudeDelta: 12.0,
                                longitudeDelta: 12.0,
                            }}
                        >
                            {TRIP.itinerary.map((day) => (
                                <React.Fragment key={day.day}>
                                    <Polyline
                                        coordinates={day.path}
                                        strokeColor={day.color}
                                        strokeWidth={5}
                                    />
                                    <Marker coordinate={day.stopLocation} anchor={{ x: 0.5, y: 1 }}>
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
            </ScrollView>

            {/* --- TRIP DETAILS MODAL --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                        <View style={styles.modalHeader}>
                            <ThemedText type="subtitle">Trip Parameters</ThemedText>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                            </TouchableOpacity>
                        </View>

                        <ThemedText style={styles.modalSubtitle}>This is the data you submitted to generate this plan.</ThemedText>

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>From</ThemedText>
                            <ThemedText style={styles.paramValue}>{TRIP.origin}</ThemedText>
                        </View>
                        <View style={styles.paramSeparator} />

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>To</ThemedText>
                            <ThemedText style={styles.paramValue}>{TRIP.destination}</ThemedText>
                        </View>
                        <View style={styles.paramSeparator} />

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>Travelers</ThemedText>
                            <ThemedText style={styles.paramValue}>{TRIP.travelers} People</ThemedText>
                        </View>
                        <View style={styles.paramSeparator} />

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>Vehicle</ThemedText>
                            <ThemedText style={styles.paramValue}>{TRIP.vehicle}</ThemedText>
                        </View>
                        <View style={styles.paramSeparator} />

                        <View style={styles.paramRow}>
                            <ThemedText style={styles.paramLabel}>Budget</ThemedText>
                            <ThemedText style={styles.paramValue}>${TRIP.totalBudget} ({TRIP.budgetType})</ThemedText>
                        </View>
                    </View>
                </View>
            </Modal>

        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    scrollView: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    // Header
    headerContainer: {
        height: 280,
        width: '100%',
        position: 'relative',
    },
    headerImage: {
        width: '100%',
        height: '100%',
    },
    gradientOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    navBar: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    glassButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    glassPill: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    budgetText: {
        color: '#fff',
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    titleWrapper: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    tripLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontFamily: Fonts.medium,
    },
    destinationTitle: {
        fontSize: 34,
        color: '#fff',
        fontFamily: Fonts.bold,
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    subtitleText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 15,
        fontFamily: Fonts.medium,
    },
    dotSeparator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255,255,255,0.6)',
        marginHorizontal: 4,
    },

    // Map
    mapSection: {
        marginTop: -30,
        marginBottom: 20,
    },
    mapContainer: {
        height: 320,
        width: '100%',
        overflow: 'hidden',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        backgroundColor: '#fff',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    dayMarkerPill: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 3,
    },
    markerArrow: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        alignSelf: 'center',
        marginTop: -2,
    },
    dayMarkerText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },

    // Budget
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        marginBottom: 12,
        color: '#111',
    },
    budgetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    budgetCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    budgetAmount: {
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    budgetLabel: {
        fontSize: 12,
        color: '#808080',
    },

    // Itinerary
    dayCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    dayBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginRight: 12,
    },
    dayNumber: {
        fontFamily: Fonts.bold,
        fontSize: 14,
    },
    dayContent: {
        flex: 1,
    },
    grayText: {
        color: '#808080',
        fontSize: 13,
        marginTop: 2,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#808080',
        marginBottom: 24,
    },
    paramRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    paramLabel: {
        fontSize: 16,
        color: '#666',
        fontFamily: Fonts.medium,
    },
    paramValue: {
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
    paramSeparator: {
        height: 1,
        backgroundColor: '#F0F0F0',
    }
});