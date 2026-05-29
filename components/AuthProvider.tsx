
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { UserProfile } from '../types';
import { paymentService } from '../services/paymentService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    role: 'student' | 'admin' | null;
    isBlocked: boolean;
    accessEnabled: boolean;
    isDemo: boolean;
    avatarUrl: string | null;
    documentNumber: string | null;
    isOverdue: boolean;
    isStrictlyOverdue: boolean;
    tourCompleted: boolean;
    status: 'active' | 'inactive';
    markTourCompleted: () => Promise<void>;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    role: null,
    isBlocked: false,
    accessEnabled: true,
    isDemo: false,
    avatarUrl: null,
    documentNumber: null,
    isOverdue: false,
    isStrictlyOverdue: false,
    tourCompleted: true,
    status: 'active',
    loading: true,
    signOut: async () => {},
    refreshProfile: async () => {},
    markTourCompleted: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [role, setRole] = useState<'student' | 'admin' | null>(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [accessEnabled, setAccessEnabled] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [documentNumber, setDocumentNumber] = useState<string | null>(null);
    const [isOverdue, setIsOverdue] = useState(false);
    const [isStrictlyOverdue, setIsStrictlyOverdue] = useState(false);
    const [tourCompleted, setTourCompleted] = useState(true);
    const [status, setStatus] = useState<'active' | 'inactive'>('active');
    const [loading, setLoading] = useState(true);

    const fetchRole = async (userId: string) => {
        try {

            const { data, error } = await supabase
                .from('profiles')
                .select('role, is_blocked, access_enabled, is_demo, avatar_url, document_number, tour_completed, status')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('Error fetching profile:', error);
                return;
            }

            const profile = data as UserProfile | null;

            if (profile) {

                setRole(profile.role as 'student' | 'admin');

                setIsBlocked(profile.is_blocked || false);

                setIsDemo(profile.is_demo === true);

                setAccessEnabled(
                    (profile.access_enabled !== false) ||
                    profile.is_demo === true
                );

                setAvatarUrl(profile.avatar_url);

                setDocumentNumber(profile.document_number);

                setTourCompleted(profile.tour_completed !== false);

                setStatus(profile.status || 'active');

                setIsOverdue(false);

                setIsStrictlyOverdue(false);

                if (profile.role === 'student') {

                    try {

                        const pStatus = await paymentService.checkOverdueStatus();

                        setIsOverdue(pStatus.isOverdue);

                        setIsStrictlyOverdue(pStatus.isStrictlyOverdue);

                    } catch (paymentError) {

                        console.error(
                            'Payment status error:',
                            paymentError
                        );
                    }
                }
            }

        } catch (err) {

            console.error('fetchRole crash:', err);
        }
    };

    useEffect(() => {

        const initializeAuth = async () => {

            try {

                const {
                    data: { session },
                    error
                } = await supabase.auth.getSession();

                if (error) {
                    console.error('Session error:', error);
                }

                setSession(session);

                setUser(session?.user ?? null);

                setIsDemo(
                    session?.user?.email === 'demo@nexus.com'
                );

                if (session?.user) {
                    await fetchRole(session.user.id);
                }

            } catch (err) {

                console.error(
                    'Initialize auth crash:',
                    err
                );

            } finally {

                setLoading(false);
            }
        };

        initializeAuth();

        const {
            data: { subscription }
        } = supabase.auth.onAuthStateChange(
            async (_event, session) => {

                try {

                    setSession(session);

                    setUser(session?.user ?? null);

                    setIsDemo(
                        session?.user?.email === 'demo@nexus.com'
                    );

                    if (session?.user) {

                        setTimeout(() => {
                            fetchRole(session.user.id);
                        }, 0);

                    } else {

                        setRole(null);

                        setIsDemo(false);

                        setIsOverdue(false);

                        setIsStrictlyOverdue(false);
                    }

                } catch (err) {

                    console.error(
                        'Auth state change crash:',
                        err
                    );

                } finally {

                    setLoading(false);
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };

    }, []);

    const refreshProfile = async () => {

        if (user) {
            await fetchRole(user.id);
        }
    };

    const signOut = async () => {

        try {

            await supabase.auth.signOut();

        } catch (err) {

            console.error('Sign out error:', err);
        }
    };

    const markTourCompleted = async () => {

        if (user) {

            try {

                setTourCompleted(true);

                await supabase
                    .from('profiles')
                    .update({
                        tour_completed: true
                    })
                    .eq('id', user.id);

            } catch (err) {

                console.error(
                    'Tour update error:',
                    err
                );
            }
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                role,
                isBlocked,
                accessEnabled,
                isDemo,
                avatarUrl,
                documentNumber,
                isOverdue,
                isStrictlyOverdue,
                tourCompleted,
                status,
                markTourCompleted,
                loading,
                signOut,
                refreshProfile
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};
