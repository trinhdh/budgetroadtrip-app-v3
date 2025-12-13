import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';

// 2. Comment out the native Google Import
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (e: string, p: string) => Promise<void>;
    signUp: (e: string, p: string, name?: string) => Promise<void>;
    signInWithGoogle: (() => Promise<void>) | null; // Make it nullable
    logout: () => Promise<void>;
    sendPasswordReset: (email: string) => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signUp: async () => { },
    signInWithGoogle: null,
    sendPasswordReset: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
});

// 3. Comment out configuration
/*
GoogleSignin.configure({
    webClientId: 'YOUR_WEB_CLIENT_ID', 
});
*/

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const refreshUser = async () => {
        if (auth.currentUser) {
            await auth.currentUser.reload();
            setUser(auth.currentUser);
            setRefreshKey(prev => prev + 1);
        }
    };
    const signIn = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const signUp = async (email: string, pass: string, displayName?: string) => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);

        if (displayName) {
            await updateProfile(userCredential.user, { displayName });
            setUser(userCredential.user);
        }
    };

    // 4. Disable Google Sign In for now (Expo Go safe)
    const signInWithGoogle = null;
    /*
    const signInWithGoogle = async () => {
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            const { idToken } = await GoogleSignin.getTokens();
            if (!idToken) throw new Error('No ID token found');
            const googleCredential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, googleCredential);
        } catch (error) {
            console.error("Google Sign-In Error", error);
            throw error;
        }
    };
    */
    const sendPasswordReset = async (email: string) => {
        await sendPasswordResetEmail(auth, email);
    };
    const logout = async () => {
        // await GoogleSignin.signOut(); // Comment out
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout, sendPasswordReset, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);