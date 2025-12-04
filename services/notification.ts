import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// 1. Configure how notifications appear when the app is OPEN
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});


export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    // 2. Check if physical device (Simulators can't receive push notifications)
    if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
    }

    // 3. Request Permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return null;
    }

    // 4. Get the Expo Push Token
    // We use the Project ID from your app config to ensure it maps correctly
    try {
        const projectId =
            Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;

        if (!projectId) {
            // Only strictly required for EAS builds, but good practice
            console.log("Project ID not found (Expected in EAS build)");
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
        });

        console.log("Expo Push Token:", tokenData.data);
        return tokenData.data;
    } catch (error) {
        console.error("Error getting push token:", error);
        return null;
    }
}