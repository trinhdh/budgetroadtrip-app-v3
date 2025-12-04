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

// --- HELPERS ---
const getCategoryLabel = (type: string) => {
    switch (type) {
        case 'hotel': return 'Accommodation';
        case 'food': return 'Food';
        case 'activity': return 'Activity';
        default: return 'Other';
    }
};

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

const OTHER_HOTELS = [
    { id: 'h2', title: 'Hilton Downtown', desc: 'City Center • 4 Star', price: 165, rating: 4.5, image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?q=80&w=500&auto=format&fit=crop' },
    { id: 'h3', title: 'Graduate Richmond', desc: 'Boutique Hotel', price: 140, rating: 4.3, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=500&auto=format&fit=crop' },
    { id: 'h4', title: 'Quirk Hotel', desc: 'Arts District', price: 210, rating: 4.7, image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=500&auto=format&fit=crop' },
];

const OTHER_FOOD = [
    { id: 'f2', title: 'Tacos & Tequila', desc: 'Mexican • Casual', price: 25, rating: 4.6, image: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=500&auto=format&fit=crop' },
    { id: 'f3', title: 'The Burger Joint', desc: 'American • Fast', price: 15, rating: 4.2, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500&auto=format&fit=crop' },
];

const OTHER_ACTIVITIES = [
    { id: 'a2', title: 'City Museum', desc: 'History & Art', price: 12, rating: 4.8, image: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?q=80&w=500&auto=format&fit=crop' },
    { id: 'a3', title: 'Botanical Garden', desc: 'Nature Walk', price: 18, rating: 4.7, image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=500&auto=format&fit=crop' },
];

export default function DayDetailsScreen() {
    const router = useRouter();
    const theme = useColorScheme() ?? 'light';
    const colors = Colors[theme];
    const insets = useSafeAreaInsets();
    const mapRef = useRef<MapView>(null);

    const [dayData, setDayData] = useState(INITIAL_DAY_DATA);
    const [timelineData, setTimelineData] = useState(INITIAL_DAY_DATA.timeline);

    // Edit State
    const [editMode, setEditMode] = useState<'none' | 'note' | 'activity'>('none');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ title: '', price: '', desc: '', address: '', notes: '' });

    // Replacement State
    const [replaceModalVisible, setReplaceModalVisible] = useState(false);
    const [selectedOption, setSelectedOption] = useState<any>(null);
    const [itemToReplaceId, setItemToReplaceId] = useState<string | null>(null);

    // --- HELPER: Get Options for Item Type ---
    const getOptions = (type: string) => {
        if (type === 'hotel') return OTHER_HOTELS;
        if (type === 'food') return OTHER_FOOD;
        if (type === 'activity') return OTHER_ACTIVITIES;
        return [];
    };

    // --- HANDLERS ---
    const openOptionDetails = (option: any, originalItemId: string) => {
        setSelectedOption(option);
        setItemToReplaceId(originalItemId);
        setReplaceModalVisible(true);
    };

    const confirmReplacement = () => {
        if (itemToReplaceId && selectedOption) {
            setTimelineData(prev => prev.map(item =>
                item.id === itemToReplaceId
                    ? {
                        ...item,
                        title: selectedOption.title,
                        desc: selectedOption.desc,
                        price: selectedOption.price,
                        image: selectedOption.image
                    }
                    : item
            ));
            setReplaceModalVisible(false);
            setSelectedOption(null);
            setItemToReplaceId(null);
        }
    };

    const openNoteModal = () => {
        setEditForm(prev => ({ ...prev, notes: dayData.notes || '' }));
        setEditMode('note');
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
        setEditForm({ title: '', desc: '', address: '', price: '', notes: editForm.notes });
        setEditMode('activity');
    };

    const saveChanges = () => {
        if (editMode === 'note') {
            setDayData({ ...dayData, notes: editForm.notes });
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

    // --- RENDER CARD ---
    const renderItem = ({ item, drag, isActive }: RenderItemParams<any>) => {
        const options = getOptions(item.type);
        const hasOptions = options.length > 0;

        return (
            <ScaleDecorator>
                <View style={{ marginBottom: 16 }}>
                    {/* Main Card */}
                    <TouchableOpacity
                        onLongPress={drag}
                        disabled={isActive}
                        activeOpacity={0.9}
                        style={[
                            styles.activityCard,
                            {
                                backgroundColor: isActive ? colors.tint + '10' : colors.background,
                                borderColor: isActive ? colors.tint : colors.icon + '20',
                                marginBottom: 0
                            }
                        ]}
                    >
                        {item.image && (
                            <Image source={{ uri: item.image }} style={styles.activityImage} />
                        )}

                        <View style={styles.activityContent}>
                            <View style={styles.activityHeader}>
                                <View style={styles.titleRow}>
                                    <View style={[styles.categoryBadge, { backgroundColor: item.color + '20', borderColor: item.color + '40' }]}>
                                        <ThemedText style={[styles.categoryText, { color: item.color }]}>
                                            {getCategoryLabel(item.type)}
                                        </ThemedText>
                                    </View>
                                </View>
                                <TouchableOpacity onPress={() => openActivityModal(item)} style={styles.editIconBtn}>
                                    <IconSymbol name="pencil" size={18} color={colors.icon} />
                                </TouchableOpacity>
                            </View>

                            <ThemedText type="defaultSemiBold" style={styles.cardTitle}>{item.title}</ThemedText>

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

                            {/* Book Now Button (Only for Hotels) */}
                            {item.type === 'hotel' && (
                                <TouchableOpacity
                                    style={[styles.bookButton, { backgroundColor: colors.tint }]}
                                    onPress={() => alert('Booking flow...')}
                                >
                                    <ThemedText style={styles.bookButtonText}>Book Now</ThemedText>
                                </TouchableOpacity>
                            )}

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

                    {/* --- OTHER OPTIONS (Inside the Item) --- */}
                    {hasOptions && (
                        <View style={styles.otherOptionsContainer}>
                            <ThemedText style={styles.subSectionTitle}>Other {getCategoryLabel(item.type)} Options</ThemedText>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {options.map((option) => (
                                    <TouchableOpacity
                                        key={option.id}
                                        style={styles.smallOptionCard}
                                        onPress={() => openOptionDetails(option, item.id)}
                                    >
                                        <Image source={{ uri: option.image }} style={styles.smallOptionImage} />
                                        <View style={styles.smallOptionContent}>
                                            <ThemedText numberOfLines={1} style={styles.smallOptionTitle}>{option.title}</ThemedText>
                                            <View style={styles.smallOptionFooter}>
                                                <ThemedText style={styles.smallOptionPrice}>${option.price}</ThemedText>
                                                <View style={styles.smallRating}>
                                                    <IconSymbol name="star.fill" size={10} color="#FFD700" />
                                                    <ThemedText style={styles.smallRatingText}>{option.rating}</ThemedText>
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>
            </ScaleDecorator>
        );
    };

    const renderHeader = () => (
        <View>
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
            <ThemedText type="subtitle" style={styles.sectionTitle}>Timeline</ThemedText>
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

                {/* --- EDIT MODAL --- */}
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
                                        {editMode === 'activity'
                                            ? (selectedItemId ? 'Edit Activity' : 'New Activity')
                                            : 'General Note'}
                                    </ThemedText>
                                    <TouchableOpacity onPress={() => setEditMode('none')}>
                                        <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                                    </TouchableOpacity>
                                </View>

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
                            </View>
                        </KeyboardAvoidingView>
                    </View>
                </Modal>

                {/* --- REPLACEMENT MODAL --- */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={replaceModalVisible}
                    onRequestClose={() => setReplaceModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={() => setReplaceModalVisible(false)}>
                            <View style={styles.modalBackdrop} />
                        </TouchableWithoutFeedback>
                        <View style={[styles.modalContent, { backgroundColor: colors.background, paddingBottom: 50 }]}>
                            {selectedOption && (
                                <>
                                    <View style={styles.modalHeader}>
                                        <ThemedText type="subtitle">Option Details</ThemedText>
                                        <TouchableOpacity onPress={() => setReplaceModalVisible(false)}>
                                            <IconSymbol name="minus" size={24} color={colors.text} style={{ transform: [{ rotate: '45deg' }] }} />
                                        </TouchableOpacity>
                                    </View>

                                    <Image source={{ uri: selectedOption.image }} style={styles.replaceModalImage} />

                                    <View style={{ marginTop: 16 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <ThemedText type="title" style={{ fontSize: 22 }}>{selectedOption.title}</ThemedText>
                                            <View style={styles.ratingBadge}>
                                                <IconSymbol name="star.fill" size={14} color="#fff" />
                                                <ThemedText style={styles.ratingText}>{selectedOption.rating}</ThemedText>
                                            </View>
                                        </View>
                                        <ThemedText style={{ color: '#808080', fontSize: 16, marginTop: 4 }}>{selectedOption.desc}</ThemedText>
                                        <ThemedText style={{ fontSize: 20, fontFamily: Fonts.bold, marginTop: 12 }}>${selectedOption.price}</ThemedText>
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: colors.tint, marginTop: 24 }]}
                                        onPress={confirmReplacement}
                                    >
                                        <ThemedText style={styles.saveButtonText}>Replace Current Item</ThemedText>
                                    </TouchableOpacity>
                                </>
                            )}
                        </View>
                    </View>
                </Modal>

            </ThemedView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    mapHeader: { height: 300, width: '100%', position: 'relative' },
    map: { width: '100%', height: '100%' },
    topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
    backButton: { position: 'absolute', left: 20, padding: 8, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
    markerContainer: { alignItems: 'center', justifyContent: 'center' },
    markerBubble: { backgroundColor: '#fff', padding: 6, borderRadius: 12, borderWidth: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    markerArrow: { width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 8, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#fff', marginTop: -2 },
    headerBlock: { paddingHorizontal: 24, paddingTop: 24, marginBottom: 20 },
    dateLabel: { color: '#808080', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, fontFamily: Fonts.medium },
    statRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
    statText: { fontSize: 14, fontFamily: Fonts.medium },
    divider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: 20, marginHorizontal: 24 },
    sectionTitle: { fontSize: 18, marginLeft: 24, marginBottom: 10 },

    // Card Styles
    activityCard: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#F5F5F5', padding: 12, marginHorizontal: 24, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
    activityImage: { width: '100%', height: 120, borderRadius: 12, marginBottom: 12 },
    activityContent: { gap: 6 },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
    categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    categoryText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    cardTitle: { fontSize: 16, marginTop: 4 },
    editIconBtn: { padding: 4, marginLeft: 8 },
    activityMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4, flexWrap: 'wrap' },
    metaText: { fontSize: 12, color: '#808080' },
    dotSeparator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#ccc', marginHorizontal: 4 },
    activityDesc: { color: '#808080', fontSize: 13, marginBottom: 8 },
    activityFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
    priceTag: { backgroundColor: '#F9F9F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#EEEEEE' },
    priceText: { fontSize: 12, color: '#555', fontFamily: Fonts.medium },

    // Book Button
    bookButton: { marginTop: 12, marginBottom: 4, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    bookButtonText: { color: '#fff', fontFamily: Fonts.bold, fontSize: 14 },

    // Other Options
    otherOptionsContainer: { marginTop: 8, paddingLeft: 24, marginBottom: 20 },
    subSectionTitle: { fontSize: 12, fontFamily: Fonts.bold, color: '#808080', marginBottom: 8, textTransform: 'uppercase' },
    smallOptionCard: { width: 130, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#EEEEEE', overflow: 'hidden', marginRight: 12 },
    smallOptionImage: { width: '100%', height: 80 },
    smallOptionContent: { padding: 8 },
    smallOptionTitle: { fontSize: 12, fontFamily: Fonts.medium, marginBottom: 4 },
    smallOptionFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    smallOptionPrice: { fontSize: 12, fontFamily: Fonts.bold },
    smallRating: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    smallRatingText: { fontSize: 10, color: '#666' },

    // Footer & Notes
    footerContainer: { paddingHorizontal: 24, paddingBottom: 20 },
    addItemButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', marginBottom: 20 },
    addItemText: { fontSize: 15, fontFamily: Fonts.medium },
    sectionHeaderRow: { marginBottom: 10 },
    notesContainer: { backgroundColor: '#FFFDE7', padding: 16, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FBC02D' },
    noteEditIcon: { position: 'absolute', right: 12, top: 12, opacity: 0.5 },
    notesText: { fontSize: 15, color: '#333', lineHeight: 22 },

    // Modals
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    inputContainer: { marginBottom: 16 },
    label: { fontSize: 14, marginBottom: 6, fontFamily: Fonts.medium, color: '#666' },
    input: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16 },
    textArea: { borderWidth: 1, borderRadius: 12, padding: 12, fontSize: 16, minHeight: 120 },
    saveButton: { height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    saveButtonText: { color: '#fff', fontSize: 16, fontFamily: Fonts.bold },

    // Replace Modal Specifics
    replaceModalImage: { width: '100%', height: 200, borderRadius: 16 },
    ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, gap: 4 },
    ratingText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
});