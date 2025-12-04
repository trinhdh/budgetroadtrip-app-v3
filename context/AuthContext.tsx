import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    User,
} from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../firebaseConfig';

// 2. Comment out the native Google Import
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (e: string, p: string) => Promise<void>;
    signUp: (e: string, p: string) => Promise<void>;
    signInWithGoogle: (() => Promise<void>) | null; // Make it nullable
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => { },
    signUp: async () => { },
    signInWithGoogle: null,
    logout: async () => { },
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

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const signIn = async (email: string, pass: string) => {
        await signInWithEmailAndPassword(auth, email, pass);
    };

    const signUp = async (email: string, pass: string) => {
        await createUserWithEmailAndPassword(auth, email, pass);
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

    const logout = async () => {
        // await GoogleSignin.signOut(); // Comment out
        await signOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);