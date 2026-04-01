import React, { createContext, useContext, useState, useEffect } from 'react';
import { setUserAuth } from '../services/api';

const UserAuthContext = createContext(null);

export const UserAuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const raw = localStorage.getItem('userCreds');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (user && user.token) {
            setUserAuth(user.token);
            localStorage.setItem('userCreds', JSON.stringify(user));
        } else {
            setUserAuth(null);
            localStorage.removeItem('userCreds');
        }
    }, [user]);

    return (
        <UserAuthContext.Provider value={{ user, setUser }}>
            {children}
        </UserAuthContext.Provider>
    );
};

export const useUserAuth = () => useContext(UserAuthContext);

