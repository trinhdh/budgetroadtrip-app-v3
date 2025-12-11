import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Keyboard,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type BottomSheetModalProps = {
    isVisible: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    height?: string | number;
};

export const BottomSheetModal = ({
    isVisible,
    onClose,
    children,
    title,
    height = "40%",
}: BottomSheetModalProps) => {
    const [showModal, setShowModal] = useState(isVisible);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const keyboardOffsetAnim = useRef(new Animated.Value(0)).current;

    const dragY = useRef(new Animated.Value(0)).current; // drag offset
    const lastDragValue = useRef(0);

    const sheetHeight = useMemo(() => {
        if (typeof height === "string" && height.includes("%")) {
            const pct = parseFloat(height.replace("%", "")) / 100;
            return SCREEN_HEIGHT * pct;
        }
        return typeof height === "number" ? height : SCREEN_HEIGHT * 0.4;
    }, [height]);

    // PAN RESPONDER (SWIPE DOWN)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, gesture) => {
                return gesture.dy > 5; // detect downward movement
            },

            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) {
                    dragY.setValue(gesture.dy); // track drag
                }
                lastDragValue.current = gesture.dy;
            },

            onPanResponderRelease: (_, gesture) => {
                const SWIPE_CLOSE_DISTANCE = 120; // px
                const SWIPE_CLOSE_SPEED = 1.2; // velocity threshold

                if (
                    gesture.dy > SWIPE_CLOSE_DISTANCE || // dragged far
                    gesture.vy > SWIPE_CLOSE_SPEED // fast swipe
                ) {
                    closeSheet();
                } else {
                    // Snap back
                    Animated.spring(dragY, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const closeSheet = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: sheetHeight,
                duration: 250,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(() => {
            dragY.setValue(0);
            setShowModal(false);
            onClose();
        });
    };

    // OPEN / CLOSE ANIMATIONS
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
            closeSheet();
        }
    }, [isVisible]);

    // KEYBOARD LISTENERS
    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

        const showSub = Keyboard.addListener(showEvent, (e) => {
            Animated.timing(keyboardOffsetAnim, {
                toValue: e.endCoordinates.height,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });

        const hideSub = Keyboard.addListener(hideEvent, () => {
            Animated.timing(keyboardOffsetAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }).start();
        });

        return () => {
            showSub.remove();
            hideSub.remove();
        };
    }, []);

    if (!showModal) return null;

    return (
        <Modal transparent visible={showModal} animationType="none" onRequestClose={closeSheet}>
            <View style={styles.container}>
                {/* BACKDROP */}
                <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
                    <Pressable style={{ flex: 1 }} onPress={closeSheet} />
                </Animated.View>

                {/* BOTTOM SHEET */}
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.sheetContainer,
                        {
                            height: sheetHeight,
                            transform: [
                                { translateY: slideAnim },
                                { translateY: dragY },
                                {
                                    translateY: Animated.multiply(keyboardOffsetAnim, -1),
                                },
                            ],
                        },
                    ]}
                >
                    {/* HEADER */}
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.content}>{children}</View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-end",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    sheetContainer: {
        backgroundColor: "white",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: "hidden",
        elevation: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: "#F5F5F5",
    },
    title: {
        fontSize: 18,
        fontWeight: "700",
    },
    closeButton: {
        backgroundColor: "#F0F2F5",
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: "center",
        alignItems: "center",
    },
    closeText: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#666",
    },
    content: {
        flex: 1,
        padding: 20,
    },
});
