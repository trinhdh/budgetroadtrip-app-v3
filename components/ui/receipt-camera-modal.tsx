import { BottomSheetModal } from '@/components/ui/bottom-sheet-modal';
import { Colors } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

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

    // --- LOGIC: Take Picture ---
    const takePicture = async () => {
        if (cameraRef.current) {
            try {
                const photoData = await cameraRef.current.takePictureAsync({
                    quality: 0.5,
                    base64: true,
                });
                setPhoto(photoData?.uri || null);
            } catch (error) {
                console.error("Failed to take picture:", error);
            }
        }
    };

    // --- LOGIC: Confirm & Simulate OCR ---
    const confirmPhoto = async () => {
        if (!photo) return;
        setProcessing(true);

        // Simulate API delay
        setTimeout(() => {
            const mockExtractedData = {
                merchant: "Starbucks",
                amount: "12.50",
                date: new Date().toISOString().split('T')[0],
                category: "Food"
            };

            setProcessing(false);
            onCapture(photo, mockExtractedData);
            setPhoto(null);
            onClose(); // Close modal after capture
        }, 1500);
    };

    const retake = () => {
        setPhoto(null);
    };

    // --- RENDER: Permission State ---
    if (!permission || !permission.granted) {
        return (
            <BottomSheetModal isVisible={visible} onClose={onClose} height="40%" title="Camera Permission">
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionText}>
                        We need access to your camera to scan receipts.
                    </Text>
                    <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                        <Text style={styles.btnText}>Grant Permission</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetModal>
        );
    }

    // --- RENDER: Camera / Preview ---
    return (
        <BottomSheetModal
            isVisible={visible}
            onClose={onClose}
            title={photo ? "Confirm Receipt" : "Scan Receipt"}
            height="90%" // Tall modal for camera
        >
            <View style={styles.container}>
                {photo ? (
                    // PREVIEW MODE
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: photo }} style={styles.previewImage} contentFit="contain" />

                        {processing ? (
                            <View style={styles.processingOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                                <Text style={styles.processingText}>Analyzing...</Text>
                            </View>
                        ) : (
                            <View style={styles.previewControls}>
                                <TouchableOpacity onPress={retake} style={styles.retakeBtn}>
                                    <Text style={styles.retakeText}>Retake</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={confirmPhoto} style={styles.confirmBtn}>
                                    <Text style={styles.btnText}>Use Photo</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    // CAMERA MODE
                    <View style={styles.cameraContainer}>
                        <CameraView style={styles.camera} ref={cameraRef} facing="back">
                            <View style={styles.cameraOverlay}>
                                <View style={styles.guideFrame} />
                            </View>
                        </CameraView>

                        <View style={styles.cameraControls}>
                            <TouchableOpacity style={styles.captureBtnOuter} onPress={takePicture}>
                                <View style={styles.captureBtnInner} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </BottomSheetModal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, overflow: 'hidden', borderRadius: 16 },

    // Permission
    permissionContainer: { alignItems: 'center', justifyContent: 'center', padding: 20, flex: 1 },
    permissionText: { fontSize: 16, textAlign: 'center', marginBottom: 20, color: '#666' },

    // Camera
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    cameraOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    guideFrame: { width: 250, height: 350, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)', borderRadius: 20 },
    cameraControls: {
        height: 100,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center'
    },
    captureBtnOuter: {
        width: 70, height: 70, borderRadius: 35,
        borderWidth: 4, borderColor: '#fff',
        justifyContent: 'center', alignItems: 'center'
    },
    captureBtnInner: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#fff',
    },

    // Preview
    previewContainer: { flex: 1, backgroundColor: '#f0f0f0' },
    previewImage: { flex: 1, borderRadius: 12 },
    previewControls: {
        flexDirection: 'row', justifyContent: 'space-evenly',
        padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderColor: '#eee'
    },
    retakeBtn: { padding: 15 },
    retakeText: { color: '#666', fontSize: 16, fontWeight: '600' },
    confirmBtn: { paddingVertical: 15, paddingHorizontal: 30, backgroundColor: Colors.light.tint, borderRadius: 12 },
    btn: { backgroundColor: Colors.light.tint, padding: 15, borderRadius: 8, minWidth: 150, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    // Processing
    processingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    processingText: { color: '#fff', marginTop: 10, fontSize: 16, fontWeight: '600' }
});