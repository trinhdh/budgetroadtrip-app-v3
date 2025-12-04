import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
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

const { width } = Dimensions.get('window');

// --- MOCK DATA ---
const INITIAL_DAY_DATA = {
    title: 'Departure & Drive',
    date: 'Dec 01',
    notes: '', // Start empty
    stats: {
        miles: '450',
        hours: '6h 30m',
        cost: '220',
    },
    region: {
        latitude: 36.0,
        longitude: -80.0,
        latitudeDelta: 6.0,
        longitudeDelta: 6.0,
    },
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
            color: '#F5A623',
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
            color: '#7ED321',
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
            color: '#9013FE',
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

    const [dayData, setDayData] = useState(INITIAL_DAY_DATA);

    // Edit Mode State ('none' | 'hotel' | 'note')
    const [editMode, setEditMode] = useState<'none' | 'hotel' | 'note'>('none');

    // Form State
    const [editForm, setEditForm] = useState({
        hotelName: '',
        hotelPrice: '',
        notes: '',
    });

    const openNoteModal = () => {
        setEditForm(prev => ({ ...prev, notes: dayData.notes || '' }));
        setEditMode('note');
    };

    const openHotelModal = () => {
        setEditForm(prev => ({
            ...prev,
            hotelName: dayData.hotel.name,
            hotelPrice: dayData.hotel.price.toString(),
        }));
        setEditMode('hotel');
    };

    const saveChanges = () => {
        if (editMode === 'note') {
            setDayData({ ...dayData, notes: editForm.notes });
        } else if (editMode === 'hotel') {
            setDayData({
                ...dayData,
                hotel: {
                    ...dayData.hotel,
                    name: editForm.hotelName,
                    price: Number(editForm.hotelPrice) || 0,
                }
            });
        }
        setEditMode('none');
    };

    return (
        <ThemedView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* --- MAP HEADER --- */}
            <View style={styles.mapHeader}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={dayData.region}
                >
                    <Polyline
                        coordinates={dayData.route}
                        strokeColor={colors.tint}
                        strokeWidth={5}
                    />
                    {dayData.timeline.map((item, index) => (
                        <Marker
                            key={item.id}
                            coordinate={item.coordinates}
                            anchor={{ x: 0.5, y: 1 }}
                            zIndex={index + 10}
                        >
                            <View style={styles.markerContainer}>
                                <View style={[styles.markerBubble, { borderColor: item.color }]}>
                                    <IconSymbol name={item.icon as any} size={14} color={item.color} />
                                    <Text style={[styles.markerText, { color: item.color }]}>{item.title}</Text>
                                </View>
                                <View style={[styles.markerArrow, { borderTopColor: item.color }]} />
                                <View style={[styles.markerDot, { backgroundColor: item.color }]} />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                <LinearGradient
                    colors={['rgba(0,0,0,0.6)', 'transparent']}
                    style={styles.topGradient}
                />

                <TouchableOpacity
                    onPress={() => router.back()}
                    style={[styles.backButton, { top: insets.top + 10 }]}
                >
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* --- CONTENT --- */}
            <ScrollView
                style={styles.contentContainer}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Daily Summary */}
                <View style={styles.headerBlock}>
                    <View>
                        <ThemedText style={styles.dateLabel}>Day 1 • {dayData.date}</ThemedText>
                        <ThemedText type="title">{dayData.title}</ThemedText>
                    </View>

                    <View style={styles.statRow}>
                        <View style={styles.statItem}>
                            <IconSymbol name="speedometer" size={16} color="#808080" />
                            <ThemedText style={styles.statText}>{dayData.stats.miles} mi</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <IconSymbol name="clock.fill" size={16} color="#808080" />
                            <ThemedText style={styles.statText}>{dayData.stats.hours}</ThemedText>
                        </View>
                        <View style={styles.statItem}>
                            <IconSymbol name="dollarsign" size={16} color={colors.tint} />
                            <ThemedText style={[styles.statText, { color: colors.tint, fontWeight: 'bold' }]}>
                                ${dayData.stats.cost}
                            </ThemedText>
                        </View>
                    </View>

                    {/* --- NOTE SECTION (Click to Edit) --- */}
                    {dayData.notes ? (
                        <TouchableOpacity
                            onPress={openNoteModal}
                            activeOpacity={0.8}
                            style={styles.notesContainer}
                        >
                            <View style={styles.noteHeader}>
                                <IconSymbol name="edit" size={14} color="#666" />
                                <ThemedText style={styles.noteLabel}>General Note</ThemedText>
                            </View>
                            <ThemedText style={styles.notesText}>{dayData.notes}</ThemedText>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={openNoteModal}
                            style={[styles.addNoteButton, { borderColor: colors.tint }]}
                        >
                            <IconSymbol name="plus" size={18} color={colors.tint} />
                            <ThemedText style={[styles.addNoteText, { color: colors.tint }]}>Add General Note</ThemedText>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.divider} />

                {/* Hotel Details Card */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText type="subtitle" style={styles.sectionTitle}>Where you're staying</ThemedText>
                        <TouchableOpacity onPress={openHotelModal}>
                            <ThemedText style={{ color: colors.tint, fontWeight: '600' }}>Edit</ThemedText>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.hotelCard}>
                        <Image source={{ uri: dayData.hotel.image }} style={styles.hotelImage} />
                        <View style={styles.hotelContent}>
                            <View style={styles.hotelHeader}>
                                <ThemedText type="defaultSemiBold" style={styles.hotelName}>{dayData.hotel.name}</ThemedText>
                                <View style={styles.ratingBadge}>
                                    <IconSymbol name="star.fill" size={12} color="#fff" />
                                    <ThemedText style={styles.ratingText}>{dayData.hotel.rating}</ThemedText>
                                </View>
                            </View>
                            <ThemedText style={styles.hotelAddress}>{dayData.hotel.address}</ThemedText>
                            <View style={styles.hotelFooter}>
                                <ThemedText style={styles.hotelCheckIn}>Check-in: {dayData.hotel.checkIn}</ThemedText>
                                <ThemedText style={styles.hotelPrice}>${dayData.hotel.price}</ThemedText>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Activity Timeline */}
                <View style={styles.section}>
                    <ThemedText type="subtitle" style={styles.sectionTitle}>Activities</ThemedText>
                    <View style={styles.timelineContainer}>
                        <View style={[styles.timelineLine, { backgroundColor: colors.icon + '40' }]} />
                        {dayData.timeline.map((item, index) => (
                            <View key={item.id} style={styles.timelineItem}>
                                <View style={styles.timeColumn}>
                                    <ThemedText style={styles.timeText}>{item.time}</ThemedText>
                                    <View style={[styles.timelineDot, { backgroundColor: item.color }]}>
                                        <IconSymbol name={item.icon as any} size={14} color="#fff" />
                                    </View>
                                </View>
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

            {/* --- SHARED EDIT MODAL --- */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={editMode !== 'none'}
                onRequestClose={() => setEditMode('none')}
            >
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback onPress={() => setEditMode('none')}>
                        <View style={styles.modalBackdrop} />
                    </TouchableWithoutFeedback>

                    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>

                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">
                                    {editMode === 'hotel' ? 'Edit Accommodation' : 'General Note'}
                                </ThemedText>
                                <TouchableOpacity onPress={() => setEditMode('none')}>
                                    <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                                </TouchableOpacity>
                            </View>

                            {/* CONDITIONAL CONTENT */}
                            {editMode === 'hotel' ? (
                                <>
                                    <View style={styles.inputContainer}>
                                        <ThemedText style={styles.label}>Hotel Name</ThemedText>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                                            value={editForm.hotelName}
                                            onChangeText={(text) => setEditForm({ ...editForm, hotelName: text })}
                                        />
                                    </View>
                                    <View style={styles.inputContainer}>
                                        <ThemedText style={styles.label}>Cost ($)</ThemedText>
                                        <TextInput
                                            style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
                                            value={editForm.hotelPrice}
                                            onChangeText={(text) => setEditForm({ ...editForm, hotelPrice: text })}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </>
                            ) : (
                                /* Note Mode */
                                <View style={styles.inputContainer}>
                                    <TextInput
                                        style={[styles.textArea, { color: colors.text, borderColor: colors.icon }]}
                                        value={editForm.notes}
                                        onChangeText={(text) => setEditForm({ ...editForm, notes: text })}
                                        placeholder="Add reminders, packing lists, or ideas..."
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        autoFocus={true}
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.saveButton, { backgroundColor: colors.tint }]}
                                onPress={saveChanges}
                            >
                                <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mapHeader: {
        height: 350,
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
        borderTopColor: '#fff',
        marginTop: -2,
    },
    markerDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 2,
    },
    contentContainer: {
        flex: 1,
        marginTop: -25,
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

    // Notes
    addNoteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
    },
    addNoteText: {
        fontSize: 14,
        fontFamily: Fonts.medium,
    },
    notesContainer: {
        marginTop: 16,
        backgroundColor: '#FFFDE7',
        padding: 14,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FBC02D',
    },
    noteHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    noteLabel: {
        fontSize: 12,
        color: '#666',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    notesText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },

    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginBottom: 24,
    },
    section: {
        marginBottom: 30,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
    },
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
    // Modal
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        fontFamily: Fonts.medium,
        color: '#666',
    },
    input: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
    },
    textArea: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        minHeight: 120,
    },
    saveButton: {
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: Fonts.bold,
    },
});