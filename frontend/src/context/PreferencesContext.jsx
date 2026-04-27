/* eslint-disable react-refresh/only-export-components */
import PropTypes from "prop-types";
import { createContext, useContext, useEffect, useState } from "react";

const PreferencesContext = createContext();

export const usePreferences = () => useContext(PreferencesContext);

export function PreferencesProvider({ children }) {
  const [preferences, setPreferences] = useState({
    segmentedFilter: "all",
  });

  useEffect(() => {
    document.body.dataset.segmentedFilter = preferences.segmentedFilter;
  }, [preferences.segmentedFilter]);

  return (
    <PreferencesContext.Provider value={{ preferences, setPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

PreferencesProvider.propTypes = {
  children: PropTypes.node,
};
