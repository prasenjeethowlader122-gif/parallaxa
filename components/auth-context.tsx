// context/AuthContext.tsx
"use client"; // This component should run on the client side

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onIdTokenChanged,
  signInWithPopup,
  getIdToken,
  signOut as firebaseSignOut,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { setCookie, destroyCookie } from 'nookies';
import Router from 'next/router';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise < void > ;
  signInWithEmail: (email: string, password: string) => Promise < void > ;
  signOut: () => Promise < void > ;
}

const AuthContext = createContext < AuthContextType | undefined > (undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState < User | null > (null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!user) {
        // User logged out, clear client-side state
        setUser(null);
        destroyCookie(null, 'token', { path: '/' });
        setLoading(false);
        return;
      }
      
      // User logged in or token refreshed
      setUser(user);
      const token = await getIdToken(user);
      setCookie(null, 'token', token, { path: '/' }); // Set session cookie
      setLoading(false);
    });
    
    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);
  
  // Force refresh token every 10 minutes (Firebase tokens auto-refresh hourly but this ensures active sessions)
  useEffect(() => {
    const handle = setInterval(async () => {
      if (user) {
        await getIdToken(user, true); // Force refresh
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => clearInterval(handle);
  }, [user]);
  
  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      // User state will be updated by onIdTokenChanged listener
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setLoading(false);
      throw error;
    }
  };
  
  const signInWithEmail = async (email: string, password: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, password);
      // User state will be updated by onIdTokenChanged listener
    } catch (error) {
      console.error('Error signing in with email:', error);
      setLoading(false);
      throw error;
    }
  };
  
  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      await fetch('/api/logout'); // Clear session cookie on server
      Router.push('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Error signing out:', error);
      setLoading(false);
      throw error;
    }
  }
}