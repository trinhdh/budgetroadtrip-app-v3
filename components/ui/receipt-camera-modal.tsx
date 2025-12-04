import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    SafeAreaView,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';
import { ThemedText } from '../themed-text';

type Props = {
    visible: boolean;
    onClose: () => void;
    onCapture: (uri: string, extractedData?: any) => void;
};

export function ReceiptCameraModal({ visible, onClose, onCapture }: Props) {
    const [permission, requestPermission] = useCameraPermissions();
    const cameraRef = useRef<CameraView>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <Modal visible={visible} animationType="slide">
                <View style={styles.permissionContainer}>
                    <ThemedText style={{ textAlign: 'center', marginBottom: 20 }}>
                        We need your permission to show the camera
                    </ThemedText>
                    <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                        <ThemedText style={styles.btnText}>Grant Permission</ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { marginTop: 10, backgroundColor: '#ccc' }]} onPress={onClose}>
                        <ThemedText style={styles.btnText}>Cancel</ThemedText>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photoData = await cameraRef.current.takePictureAsync({
                    quality: 0.7,
                    base64: true, // We need base64 to send to OCR APIs
                });
                setPhoto(photoData?.uri || null);
            } catch (error) {
                console.error("Failed to take picture:", error);
            }
        }
    };

    const confirmPhoto = async () => {
        if (!photo) return;
        setProcessing(true);

        // --- REAL OCR LOGIC WOULD GO HERE ---
        // 1. Send `photo.base64` to OpenAI Vision / Google Cloud Vision
        // 2. Wait for JSON response

        // Simulating "Reading" the receipt
        setTimeout(() => {
            const mockExtractedData = {
                merchant: "Target",
                amount: "84.55",
                date: "2023-12-04",
                category: "Food"
            };

            setProcessing(false);
            onCapture(photo, mockExtractedData);
            setPhoto(null);
        }, 2000);
    };

    const retake = () => {
        setPhoto(null);
    };

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                {photo ? (
                    // PREVIEW MODE
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: photo }} style={styles.previewImage} contentFit="contain" />

                        {processing ? (
                            <View style={styles.processingOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                                <ThemedText style={{ color: '#fff', marginTop: 10 }}>Reading Receipt...</ThemedText>
                            </View>
                        ) : (
                            <View style={styles.previewControls}>
                                <TouchableOpacity onPress={retake} style={styles.retakeBtn}>
                                    <ThemedText style={styles.textBtn}>Retake</ThemedText>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmPhoto} style={styles.confirmBtn}>
                                    <ThemedText style={styles.textBtn}>Use Photo</ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    // CAMERA MODE
                    <CameraView style={styles.camera} ref={cameraRef} facing="back">
                        <SafeAreaView style={styles.cameraUi}>
                            <View style={styles.headerRow}>
                                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                    <IconSymbol name="minus" size={28} color="#fff" style={{ transform: [{ rotate: '45deg' }] }} />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.footerRow}>
                                <TouchableOpacity style={styles.captureBtnOuter} onPress={takePicture}>
                                    <View style={styles.captureBtnInner} />
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </CameraView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    permissionContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    camera: { flex: 1 },
    cameraUi: { flex: 1, justifyContent: 'space-between' },
    headerRow: { flexDirection: 'row', justifyContent: 'flex-start', padding: 20 },
    closeBtn: { padding: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20 },
    footerRow: { paddingBottom: 40, alignItems: 'center' },
    captureBtnOuter: {
        width: 80, height: 80, borderRadius: 40,
        borderWidth: 4, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center'
    },
    captureBtnInner: {
        width: 66, height: 66, borderRadius: 33,
        backgroundColor: '#fff',
    },
    previewContainer: { flex: 1, backgroundColor: '#000' },
    previewImage: { flex: 1 },
    previewControls: {
        flexDirection: 'row', justifyContent: 'space-evenly',
        paddingBottom: 40, paddingTop: 20, backgroundColor: '#000'
    },
    retakeBtn: { padding: 15 },
    confirmBtn: { padding: 15, backgroundColor: Colors.light.tint, borderRadius: 8 },
    textBtn: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    btn: { backgroundColor: Colors.light.tint, padding: 15, borderRadius: 8, width: 200, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold' },
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    }
});