import React, { createContext, useContext, useState, useEffect } from "react";
import de from "./locales/de.json";
import en from "./locales/en.json";

const LOCALES = { de, en };

const ThemeCtx = createContext(null);
const I18nCtx  = createContext(null);

export function AppProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem("sm_theme") || "dark");
  const [lang,  setLang]  = useState(() => localStorage.getItem("sm_lang")  || "de");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sm_theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("sm_lang", lang);
  }, [lang]);

  const translations = LOCALES[lang] ?? LOCALES.de;

  function t(key, vars = {}) {
    let text = translations[key] ?? LOCALES.de[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
    return text;
  }

  const toggleTheme = () => setTheme(p => p === "dark" ? "light" : "dark");
  const toggleLang  = () => setLang(p  => p === "de"   ? "en"   : "de");

  return (
    <ThemeCtx.Provider value={{ theme, toggleTheme }}>
      <I18nCtx.Provider value={{ lang, toggleLang, t }}>
        {children}
      </I18nCtx.Provider>
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
export const useI18n  = () => useContext(I18nCtx);
