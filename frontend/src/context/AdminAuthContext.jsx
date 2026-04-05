/* eslint-disable react-refresh/only-export-components */
import PropTypes from 'prop-types';
import { createContext, useContext, useState, useEffect } from 'react';
import { setAdminAuth } from '../services/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
    const [admin, setAdmin] = useState(() => {
        try {
            const raw = localStorage.getItem('adminCreds');
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    });

    useEffect(() => {
        if (admin && admin.username && admin.password) {
            setAdminAuth(admin.username, admin.password);
            localStorage.setItem('adminCreds', JSON.stringify(admin));
        } else {
            setAdminAuth(null, null);
            localStorage.removeItem('adminCreds');
        }
    }, [admin]);

    return (
        <AdminAuthContext.Provider value={{ admin, setAdmin }}>
            {children}
        </AdminAuthContext.Provider>
    );
};

export const useAdminAuth = () => useContext(AdminAuthContext);

AdminAuthProvider.propTypes = {
    children: PropTypes.node,
};

