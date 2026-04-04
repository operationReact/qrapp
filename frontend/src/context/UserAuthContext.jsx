/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
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

    useEffect(() => {
        const handleLogout = () => setUser(null);
        window.addEventListener('auth:logout', handleLogout);
        return () => window.removeEventListener('auth:logout', handleLogout);
    }, []);

    return (
        <UserAuthContext.Provider value={{ user, setUser }}>
            {children}
        </UserAuthContext.Provider>
    );
};

UserAuthProvider.propTypes = {
    children: PropTypes.node,
};

export const useUserAuth = () => useContext(UserAuthContext);

