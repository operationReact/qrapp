import { setUserAuth } from "@/services";
import { getCurrentUser } from "@/services/auth-service";
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
        setUserState({
          ...storedUser,
          ...profile,
          token: storedUser.token,
          info: profile,
        });
      })
      .catch((error) => {
        if (!active) return;
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

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAdmin, isSuperUser, authInitialized }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

AuthProvider.propTypes = {
  children: PropTypes.node,
};
