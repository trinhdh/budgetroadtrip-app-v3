import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type SimpleDisplayModalProps = {
    isVisible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    height?: string | number;
};

export const SimpleDisplayModal = ({
    isVisible,
    onClose,
    children,
    title,
    height = '40%',
}: SimpleDisplayModalProps) => {
    const [showModal, setShowModal] = useState(isVisible);

    // Animated Values
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Calculate actual height value
    const sheetHeight = useMemo(() => {
        if (typeof height === 'string' && height.includes('%')) {
            const percentage = parseFloat(height.replace('%', '')) / 100;
            return SCREEN_HEIGHT * percentage;
        }
        return typeof height === 'number' ? height : SCREEN_HEIGHT * 0.4;
    }, [height]);

    useEffect(() => {
        if (isVisible) {
            setShowModal(true);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    damping: 15,
                    stiffness: 100,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: sheetHeight,
                    duration: 300,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
            ]).start(({ finished }) => {
                if (finished) {
                    setShowModal(false);
                }
            });
        }
    }, [isVisible, sheetHeight, fadeAnim, slideAnim]);

    const handleClose = () => {
        onClose();
    };

    if (!showModal) return null;

    return (
        <Modal
            transparent
            visible={showModal}
            animationType="none"
            onRequestClose={handleClose}
        >
            <View style={styles.container}>
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable style={styles.backdropPressable} onPress={handleClose} />
                </Animated.View>

                {/* Modal Sheet */}
                <Animated.View
                    style={[
                        styles.sheetContainer,
                        {
                            height: sheetHeight,
                            transform: [{ translateY: slideAnim }]
                        },
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                        <Text style={styles.title}>{title}</Text>
                        <View style={styles.closeButton} />
                    </View>

                    {/* Content Area */}
                    <View style={styles.content}>
                        {children}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-end',
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    backdropPressable: {
        flex: 1,
    },
    sheetContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 10,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        textAlign: 'center',
        flex: 1,
    },
    closeButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F0F2F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeText: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'bold',
        marginTop: -2,
        ...(Platform.OS === 'android' && { marginBottom: 2 }),
    },
    content: {
        flex: 1,
    },
});