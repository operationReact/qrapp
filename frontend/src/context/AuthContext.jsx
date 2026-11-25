import { setUserAuth } from "@/services";
import { getCurrentUser } from "@/services/auth-service";
import RequiredWorkplaceSetup from "@/components/RequiredWorkplaceSetup";
import { canAccessAdmin } from "@/lib/roles";
import PropTypes from "prop-types";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const storedUser = localStorage.getItem("user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    console.warn("Unable to restore the saved authentication session", error);
    localStorage.removeItem("user");
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(readStoredUser);
  const [authInitialized, setAuthInitialized] = useState(
    () => !user?.token,
  );

  const isAdmin = canAccessAdmin(user);
  const isSuperUser = !!user?.isSuperUser;

  const setUser = useCallback((nextUser) => {
    setUserState((currentUser) => {
      const resolvedUser =
        typeof nextUser === "function" ? nextUser(currentUser) : nextUser;

      try {
        if (resolvedUser) {
          localStorage.setItem("user", JSON.stringify(resolvedUser));
        } else {
          localStorage.removeItem("user");
        }
      } catch (error) {
        console.warn("Unable to persist the authentication session", error);
      }

      setUserAuth(resolvedUser?.token);
      return resolvedUser;
    });
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }

    setUserAuth(user?.token);
  }, [user]);

  useEffect(() => {
    let active = true;
    const storedUser = user;

    if (!storedUser?.token) {
      return () => {
        active = false;
      };
    }

    setUserAuth(storedUser.token);
    getCurrentUser()
      .then((profile) => {
        if (!active) return;
        if (readStoredUser()?.token !== storedUser.token) return;
        setUserState({
          ...storedUser,
          ...profile,
          token: storedUser.token,
          info: profile,
        });
      })
      .catch((error) => {
        if (!active) return;
        if (readStoredUser()?.token !== storedUser.token) return;
        console.warn("Unable to restore the authentication session", error);
        setUserState(null);
      })
      .finally(() => {
        if (active) setAuthInitialized(true);
      });

    return () => {
      active = false;
    };
    // Session restoration must run once for the initial persisted session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handleLogout = () => setUser(null);
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [setUser]);

  const needsWorkplace = authInitialized && user?.token && user.role === "CUSTOMER" &&
    (!user.defaultLocation?.id || user.defaultLocation.active === false || !user.customerCompany?.id || user.customerCompany.active === false);

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAdmin, isSuperUser, authInitialized }}
    >
      {needsWorkplace ? <RequiredWorkplaceSetup key={user.id} user={user}
        onComplete={profile => setUser(current => ({ ...current, ...profile, info: profile }))}
        onSignOut={() => setUser(null)} /> : children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

AuthProvider.propTypes = {
  children: PropTypes.node,
};
