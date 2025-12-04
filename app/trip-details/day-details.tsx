import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useRef } from 'react';
import {
    Dimensions,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Fonts } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

// --- UPDATED MOCK DATA WITH COORDINATES ---
const DAY_DATA = {
    title: 'Departure & Drive',
    date: 'Dec 01',
    stats: {
        miles: 450,
        hours: '6h 30m',
        cost: 220,
    },
    region: {
        latitude: 36.0, // Center of the route
        longitude: -80.0,
        latitudeDelta: 6.0,
        longitudeDelta: 6.0,
    },
    // The blue drive line
    route: [
        { latitude: 33.7490, longitude: -84.3880 }, // ATL
        { latitude: 35.2271, longitude: -80.8431 }, // Charlotte
        { latitude: 36.0014, longitude: -78.9382 }, // Duke Univ
        { latitude: 37.5407, longitude: -77.4360 }, // Richmond
    ],
    hotel: {
        name: 'The Jefferson Hotel',
        image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
        rating: 4.8,
        price: 180,
        address: '101 W Franklin St, Richmond, VA',
        checkIn: '04:00 PM',
        coordinates: { latitude: 37.5407, longitude: -77.4360 },
    },
    timeline: [
        {
            id: '1',
            time: '08:00 AM',
            title: 'Start Engine',
            desc: 'Depart from Atlanta, GA',
            icon: 'car',
            color: '#4A90E2',
            type: 'drive',
            coordinates: { latitude: 33.7490, longitude: -84.3880 },
        },
        {
            id: '2',
            time: '12:30 PM',
            title: 'Midwood Smokehouse',
            desc: 'Lunch Break • Charlotte, NC',
            icon: 'fork.knife',
            color: '#F5A623', // Orange for food
            type: 'food',
            price: 45,
            image: 'https://images.unsplash.com/photo-1529193591176-1dae038cf12d?q=80&w=1000&auto=format&fit=crop',
            coordinates: { latitude: 35.2271, longitude: -80.8431 },
        },
        {
            id: '3',
            time: '03:00 PM',
            title: 'Duke University',
            desc: 'Sightseeing • Durham, NC',
            icon: 'mappin.circle.fill',
            color: '#7ED321', // Green for activity
            type: 'activity',
            price: 0,
            coordinates: { latitude: 36.0014, longitude: -78.9382 },
        },
        {
            id: '4',
            time: '06:30 PM',
            title: 'The Jefferson Hotel',
            desc: 'Check-in • Richmond, VA',
            icon: 'bed.double.fill',
            color: '#9013FE', // Purple for hotel
            type: 'hotel',
            coordinates: { latitude: 37.5407, longitude: -77.4360 },
        }
    ]
};

export default function DayDetailsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* --- 1. ENHANCED MAP HEADER --- */}
            <View style={styles.mapHeader}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={DAY_DATA.region}
                >
                    {/* The Route Line */}
                    <Polyline
                        coordinates={DAY_DATA.route}
                        strokeColor={colors.tint}
                        strokeWidth={5}
                    />

                    {/* Render Markers for each Timeline Item */}
                    {DAY_DATA.timeline.map((item, index) => (
                        <Marker
                            key={item.id}
                            coordinate={item.coordinates}
                            anchor={{ x: 0.5, y: 1 }} // Bottom center anchor
                            zIndex={index + 10}
                        >
                            <View style={styles.markerContainer}>
                                {/* Label Bubble */}
                                <View style={[styles.markerBubble, { borderColor: item.color }]}>
                                    <IconSymbol name={item.icon as any} size={14} color={item.color} />
                                    <Text style={[styles.markerText, { color: item.color }]}>{item.title}</Text>
                                </View>
                                {/* Pin Point */}
                                <View style={[styles.markerArrow, { borderTopColor: item.color }]} />
                                <View style={[styles.markerDot, { backgroundColor: item.color }]} />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                {/* Top Gradient for Back Button visibility */}
                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={styles.topGradient}
                />

                {/* Back Button */}
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backButton, { top: insets.top + 10 }]}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* --- 2. SCROLLABLE CONTENT --- */}
            <ScrollView
                style={styles.contentContainer}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Daily Summary */}
                <View style={styles.headerBlock}>
                    <View>
                        <ThemedText style={styles.dateLabel}>Day 1 • {DAY_DATA.date}</ThemedText>
                        <ThemedText type="title">{DAY_DATA.title}</ThemedText>
                    </View>
                    <View style={styles.statRow}>
                        <View style={styles.statItem}>
                            <IconSymbol name="speedometer" size={16} color="#808080" />
                            <ThemedText style={styles.statText}>{DAY_DATA.stats.miles} mi</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <IconSymbol name="clock.fill" size={16} color="#808080" />
                            <ThemedText style={styles.statText}>{DAY_DATA.stats.hours}</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <IconSymbol name="dollarsign" size={16} color={colors.tint} />
                            <ThemedText style={[styles.statText, { color: colors.tint, fontWeight: 'bold' }]}>
                                ${DAY_DATA.stats.cost}
                            </ThemedText>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Hotel Details Card */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Where you're staying</ThemedText>
                    <View style={styles.hotelCard}>
                        <Image source={{ uri: DAY_DATA.hotel.image }} style={styles.hotelImage} />
                        <View style={styles.hotelContent}>
                            <View style={styles.hotelHeader}>
                                <ThemedText type="defaultSemiBold" style={styles.hotelName}>{DAY_DATA.hotel.name}</ThemedText>
                                <View style={styles.ratingBadge}>
                                    <IconSymbol name="star.fill" size={12} color="#fff" />
                                    <ThemedText style={styles.ratingText}>{DAY_DATA.hotel.rating}</ThemedText>
                                </View>
                            </View>
                            <ThemedText style={styles.hotelAddress}>{DAY_DATA.hotel.address}</ThemedText>
                            <View style={styles.hotelFooter}>
                                <ThemedText style={styles.hotelCheckIn}>Check-in: {DAY_DATA.hotel.checkIn}</ThemedText>
                                <ThemedText style={styles.hotelPrice}>${DAY_DATA.hotel.price}</ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Activity Timeline */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Activities</ThemedText>

                    <View style={styles.timelineContainer}>
                        <View style={[styles.timelineLine, { backgroundColor: colors.icon + '40' }]} />

                        {DAY_DATA.timeline.map((item, index) => (
                            <View key={item.id} style={styles.timelineItem}>
                                {/* Time & Icon */}
                                <View style={styles.timeColumn}>
                                    <ThemedText style={styles.timeText}>{item.time}</ThemedText>
                                    <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
                                        <IconSymbol name={item.icon as any} size={14} color="#fff" />
                                    </View>
                                </View>

                                {/* Card */}
                                <View style={[styles.eventCard, { backgroundColor: colors.background }]}>
                                    {item.image && (
                                        <Image source={{ uri: item.image }} style={styles.eventImage} />
                                    )}
                                    <View style={styles.eventContent}>
                                        <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                                        <ThemedText style={styles.eventDesc}>{item.desc}</ThemedText>
                                        {item.price !== undefined && (
                                            <View style={styles.priceTag}>
                                                <ThemedText style={styles.priceText}>
                                                    {item.price === 0 ? 'Free' : `$${item.price}`}
                                                </ThemedText>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    // Map
    mapHeader: {
        height: 350, // Taller map for better visibility
        width: '100%',
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    topGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 120,
    },
    backButton: {
        position: 'absolute',
        left: 20,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 20,
    },

    // Custom Map Markers
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 2,
        gap: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    markerText: {
        fontSize: 11,
        fontWeight: '700',
    },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#fff', // Will be overridden inline
        marginTop: -2,
    },
    markerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 2,
    },

    // Content
    contentContainer: {
        flex: 1,
        marginTop: -25, // Overlap the map
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },

    // Header Info
    headerBlock: {
        marginBottom: 20,
    },
    dateLabel: {
        color: '#808080',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
        fontFamily: Fonts.medium,
    },
    statRow: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 12,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F5F5F5',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
    },
    statText: {
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 24,
    },

    // Common Section
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        marginBottom: 16,
        fontSize: 18,
    },

    // Hotel Card
    hotelCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    hotelImage: {
        width: '100%',
        height: 160,
    },
    hotelContent: {
        padding: 16,
    },
    hotelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    hotelName: {
        flex: 1,
        fontSize: 18,
        marginRight: 8,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#333',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    hotelAddress: {
        color: '#808080',
        fontSize: 14,
        marginBottom: 12,
    },
    hotelFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
        paddingTop: 12,
    },
    hotelCheckIn: {
        color: '#666',
        fontSize: 13,
        fontFamily: Fonts.medium,
    },
    hotelPrice: {
        fontSize: 18,
        fontFamily: Fonts.bold,
        color: '#333',
    },

    // Timeline
    timelineContainer: {
        paddingLeft: 10,
    },
    timelineLine: {
        position: 'absolute',
        left: 85,
        top: 24,
        bottom: 24,
        width: 2,
        borderRadius: 1,
    },
    timelineItem: {
        flexDirection: 'row',
        marginBottom: 24,
    },
    timeColumn: {
        width: 75,
        alignItems: 'flex-end',
        paddingRight: 16,
    },
    timeText: {
        fontSize: 12,
        color: '#808080',
        fontFamily: Fonts.medium,
        marginTop: 2,
    },
    timelineDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        position: 'absolute',
        right: -12,
        top: 0,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        zIndex: 2,
    },
    eventCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 12,
        marginLeft: 12,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    eventImage: {
        width: '100%',
        height: 110,
        borderRadius: 10,
        marginBottom: 10,
    },
    eventContent: {
        gap: 4,
    },
    eventDesc: {
        color: '#808080',
        fontSize: 13,
    },
    priceTag: {
        alignSelf: 'flex-start',
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    priceText: {
        fontSize: 11,
        color: '#555',
        fontFamily: Fonts.medium,
    },
});