import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    notes: '',
    stats: { miles: '450', hours: '6h 30m', cost: '220' },
    region: { latitude: 36.0, longitude: -80.0, latitudeDelta: 6.0, longitudeDelta: 6.0 },
    route: [
        { latitude: 33.7490, longitude: -84.3880 },
        { latitude: 35.2271, longitude: -80.8431 },
        { latitude: 36.0014, longitude: -78.9382 },
        { latitude: 37.5407, longitude: -77.4360 },
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
            time: '09:00 AM',
            title: 'Stone Mountain Park',
            desc: 'Morning Hike & Scenic Views',
            address: '1000 Robert E Lee Blvd',
            icon: 'mappin.circle.fill',
            color: '#4A90E2',
            type: 'activity',
            price: 20,
            image: 'https://images.unsplash.com/photo-1552083375-1447ce886485?q=80&w=1000&auto=format&fit=crop',
            coordinates: { latitude: 33.8082, longitude: -84.1454 },
        },
        {
            id: '2',
            time: '12:30 PM',
            title: 'Midwood Smokehouse',
            desc: 'Lunch • Charlotte, NC',
            address: '1401 Central Ave',
            icon: 'fork.knife',
            color: '#F5A623',
            type: 'food',
            price: 45,
            coordinates: { latitude: 35.2271, longitude: -80.8431 },
        },
        {
            id: '3',
            time: '03:00 PM',
            title: 'Duke University',
            desc: 'Chapel Tour & Gardens',
            address: 'Durham, NC 27708',
            icon: 'mappin.circle.fill',
            color: '#7ED321',
            type: 'activity',
            price: 0,
            coordinates: { latitude: 36.0014, longitude: -78.9382 },
        },
        {
            id: '4',
            time: '07:00 PM',
            title: 'The Jefferson Hotel',
            desc: 'Check-in • Richmond, VA',
            address: '101 W Franklin St',
            icon: 'bed.double.fill',
            color: '#9013FE',
            type: 'hotel',
            price: 180,
            image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=1000&auto=format&fit=crop',
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
    const [timelineData, setTimelineData] = useState(INITIAL_DAY_DATA.timeline);

    const [editMode, setEditMode] = useState<'none' | 'note' | 'activity' | 'hotel'>('none');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

    const [editForm, setEditForm] = useState({
        title: '',
        price: '',
        desc: '',
        address: '',
        hotelName: '',
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
            price: dayData.hotel.price.toString(),
        }));
        setEditMode('hotel');
    };

    const openActivityModal = (item: any) => {
        setSelectedItemId(item.id);
        setEditForm(prev => ({
            ...prev,
            title: item.title,
            desc: item.desc,
            address: item.address || '',
            price: item.price.toString(),
        }));
        setEditMode('activity');
    };

    const openAddActivityModal = () => {
        setSelectedItemId(null);
        setEditForm({
            title: '',
            desc: '',
            address: '',
            price: '',
            hotelName: '',
            notes: editForm.notes
        });
        setEditMode('activity');
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
                    price: Number(editForm.price) || 0,
                }
            });
        } else if (editMode === 'activity') {
            if (selectedItemId) {
                setTimelineData(prev => prev.map(item =>
                    item.id === selectedItemId
                        ? { ...item, title: editForm.title, desc: editForm.desc, address: editForm.address, price: Number(editForm.price) || 0 }
                        : item
                ));
            } else {
                const newItem = {
                    id: Date.now().toString(),
                    time: 'TBD',
                    title: editForm.title,
                    desc: editForm.desc,
                    address: editForm.address,
                    price: Number(editForm.price) || 0,
                    icon: 'mappin.circle.fill',
                    color: '#999',
                    type: 'activity',
                    coordinates: { latitude: 0, longitude: 0 }
                };
                setTimelineData(prev => [...prev, newItem]);
            }
        }
        setEditMode('none');
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
        return (
            <ScaleDecorator>
                <TouchableOpacity
                    onLongPress={drag}
                    disabled={isActive}
                    activeOpacity={0.9}
                    style={[
                        styles.activityCard,
                        {
                            backgroundColor: isActive ? colors.tint + '10' : colors.background,
                            borderColor: isActive ? colors.tint : colors.icon + '20'
                        }
                    ]}
                >
                    {item.image && <Image source={{ uri: item.image }} style={styles.activityImage} />}

                    <View style={styles.activityContent}>
                        <View style={styles.activityHeader}>
                            <View style={styles.titleRow}>
                                <View style={[styles.categoryDot, { backgroundColor: item.color || '#ccc' }]} />
                                <ThemedText type="defaultSemiBold" style={{ flex: 1 }}>{item.title}</ThemedText>
                            </View>
                            <TouchableOpacity onPress={() => openActivityModal(item)} style={styles.editIconBtn}>
                                <IconSymbol name="pencil" size={18} color={colors.icon} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.activityMeta}>
                            <IconSymbol name="clock.fill" size={12} color="#808080" />
                            <ThemedText style={styles.metaText}>{item.time}</ThemedText>
                            {item.address ? (
                                <>
                                    <View style={styles.dotSeparator} />
                                    <ThemedText style={styles.metaText} numberOfLines={1}>{item.address}</ThemedText>
                                </>
                            ) : null}
                        </View>

                        <ThemedText style={styles.activityDesc}>{item.desc}</ThemedText>

                        <View style={styles.activityFooter}>
                            <View style={styles.priceTag}>
                                <ThemedText style={styles.priceText}>
                                    {item.price === 0 ? 'Free' : `$${item.price}`}
                                </ThemedText>
                            </View>
                            <IconSymbol name="line.3.horizontal" size={16} color={colors.icon + '60'} />
                        </View>
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    const renderHeader = () => (
        <View>
            {/* Map Header */}
            <View style={styles.mapHeader}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    initialRegion={dayData.region}
                >
                    <Polyline coordinates={dayData.route} strokeColor={colors.tint} strokeWidth={5} />
                    {timelineData.map((item, index) => (
                        <Marker
                            key={item.id}
                            coordinate={item.coordinates}
                            anchor={{ x: 0.5, y: 1 }}
                            zIndex={index + 10}
                        >
                            <View style={styles.markerContainer}>
                                <View style={[styles.markerBubble, { borderColor: item.color }]}>
                                    <IconSymbol name={item.icon as any} size={14} color={item.color} />
                                </View>
                                <View style={[styles.markerArrow, { borderTopColor: item.color }]} />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topGradient} />

                <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { top: insets.top + 10 }]}>
                    <IconSymbol name="chevron.left" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Stats & Title */}
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
                        <IconSymbol name="dollarsign" size={16} color={colors.tint} />
                        <ThemedText style={[styles.statText, { color: colors.tint, fontWeight: 'bold' }]}>
                            ${dayData.stats.cost}
                        </ThemedText>
                    </View>
                </View>
            </View>

            <View style={styles.divider} />


            <ThemedText type="subtitle" style={styles.sectionTitle}>Activities</ThemedText>
        </View>
    );

    const renderFooter = () => (
        <View style={styles.footerContainer}>
            <TouchableOpacity style={[styles.addItemButton, { borderColor: colors.icon + '40' }]} onPress={openAddActivityModal}>
                <IconSymbol name="plus" size={20} color={colors.text} />
                <ThemedText style={styles.addItemText}>Add Activity</ThemedText>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.sectionHeaderRow}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Notes</ThemedText>
            </View>
            {dayData.notes ? (
                <TouchableOpacity onPress={openNoteModal} activeOpacity={0.8} style={styles.notesContainer}>
                    <ThemedText style={styles.notesText}>{dayData.notes}</ThemedText>
                    <View style={styles.noteEditIcon}>
                        <IconSymbol name="pencil" size={14} color="#666" />
                    </View>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity onPress={openNoteModal} style={[styles.addItemButton, { borderColor: colors.icon + '40', marginTop: 0 }]}>
                    <IconSymbol name="plus" size={20} color={colors.text} />
                    <ThemedText style={styles.addItemText}>Add Note</ThemedText>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <ThemedView style={styles.container}>
                <Stack.Screen options={{ headerShown: false }} />

                <DraggableFlatList
                    data={timelineData}
                    onDragEnd={({ data }) => setTimelineData(data)}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    ListHeaderComponent={renderHeader}
                    ListFooterComponent={renderFooter}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                />

                {/* --- 4. UPDATED MODAL (Fade style) --- */}
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

                        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
                            <View style={styles.modalHeader}>
                                <ThemedText type="subtitle">
                                    {editMode === 'hotel' ? 'Edit Accommodation' :
                                        editMode === 'activity' ? (selectedItemId ? 'Edit Activity' : 'New Activity') : 'General Note'}
                                </ThemedText>
                                <TouchableOpacity onPress={() => setEditMode('none')}>
                                    <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                                </TouchableOpacity>
                            </View>

                            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
                                {editMode === 'hotel' && (
                                    <>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Hotel Name</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.hotelName} onChangeText={(text) => setEditForm({ ...editForm, hotelName: text })} />
                                        </View>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Cost ($)</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.price} onChangeText={(text) => setEditForm({ ...editForm, price: text })} keyboardType="numeric" />
                                        </View>
                                    </>
                                )}

                                {editMode === 'activity' && (
                                    <>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Title</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.title} onChangeText={(text) => setEditForm({ ...editForm, title: text })} placeholder="e.g. Visit Museum" />
                                        </View>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Description</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.desc} onChangeText={(text) => setEditForm({ ...editForm, desc: text })} placeholder="Short description" />
                                        </View>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Address</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.address} onChangeText={(text) => setEditForm({ ...editForm, address: text })} placeholder="123 Main St" />
                                        </View>
                                        <View style={styles.inputContainer}>
                                            <ThemedText style={styles.label}>Cost ($)</ThemedText>
                                            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.icon }]} value={editForm.price} onChangeText={(text) => setEditForm({ ...editForm, price: text })} keyboardType="numeric" placeholder="0 for Free" />
                                        </View>
                                    </>
                                )}

                                {editMode === 'note' && (
                                    <View style={styles.inputContainer}>
                                        <TextInput style={[styles.textArea, { color: colors.text, borderColor: colors.icon }]} value={editForm.notes} onChangeText={(text) => setEditForm({ ...editForm, notes: text })} placeholder="Write your notes here..." multiline numberOfLines={6} textAlignVertical="top" autoFocus={true} />
                                    </View>
                                )}

                                <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.tint }]} onPress={saveChanges}>
                                    <ThemedText style={styles.saveButtonText}>Save</ThemedText>
                                </TouchableOpacity>
                            </KeyboardAvoidingView>
                        </View>
                    </View>
                </Modal>

            </ThemedView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    mapHeader: {
        height: 300,
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
        backgroundColor: '#fff',
        padding: 6,
        borderRadius: 12,
        borderWidth: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
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
    headerBlock: {
        paddingHorizontal: 24,
        paddingTop: 24,
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
        marginBottom: 20,
        marginHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 18,
        marginLeft: 24,
        marginBottom: 10,
    },
    hotelCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F5F5F5',
        marginHorizontal: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
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
    activityCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#F5F5F5',
        padding: 12,
        marginHorizontal: 24,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    activityImage: {
        width: '100%',
        height: 120,
        borderRadius: 12,
        marginBottom: 12,
    },
    activityContent: {
        gap: 6,
    },
    activityHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
    },
    categoryDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    editIconBtn: {
        padding: 4,
        marginLeft: 8,
    },
    activityMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
        flexWrap: 'wrap',
    },
    metaText: {
        fontSize: 12,
        color: '#808080',
    },
    dotSeparator: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: '#ccc',
        marginHorizontal: 4,
    },
    activityDesc: {
        color: '#808080',
        fontSize: 13,
        marginBottom: 8,
    },
    activityFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 6,
    },
    priceTag: {
        backgroundColor: '#F9F9F9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EEEEEE',
    },
    priceText: {
        fontSize: 12,
        color: '#555',
        fontFamily: Fonts.medium,
    },
    footerContainer: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderRadius: 14,
        borderWidth: 1,
        borderStyle: 'dashed',
        marginBottom: 20,
    },
    addItemText: {
        fontSize: 15,
        fontFamily: Fonts.medium,
    },
    sectionHeaderRow: {
        marginBottom: 10,
    },
    notesContainer: {
        backgroundColor: '#FFFDE7',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FBC02D',
    },
    noteEditIcon: {
        position: 'absolute',
        right: 12,
        top: 12,
        opacity: 0.5,
    },
    notesText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
    },
    // Modal Styles (Updated to match your preferred design)
    modalOverlay: {
        flex: 1,
        justifyContent: 'center', // Center vertically
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalContent: {
        width: '90%', // Give it some margin from sides
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
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