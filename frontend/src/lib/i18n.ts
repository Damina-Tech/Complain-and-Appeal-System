import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { translations } from "./translations/index";

// Flatten translations for i18next format
function flattenTranslations() {
  const flattened: Record<string, Record<string, any>> = {
    en: { translation: {} },
    am: { translation: {} },
    om: { translation: {} },
  };

  Object.keys(translations).forEach((namespace) => {
    const ns = namespace as keyof typeof translations;
    Object.keys(translations[ns].en).forEach((key) => {
      flattened.en.translation[`${namespace}.${key}`] = translations[ns].en[key as keyof typeof translations[typeof ns]["en"]];
      flattened.am.translation[`${namespace}.${key}`] = translations[ns].am[key as keyof typeof translations[typeof ns]["am"]];
      flattened.om.translation[`${namespace}.${key}`] = translations[ns].om[key as keyof typeof translations[typeof ns]["om"]];
    });
  });

  return flattened;
}

const resources = flattenTranslations();

export function initI18n() {
  if (!i18n.isInitialized) {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: "en",
        supportedLngs: ["en", "am", "om"],
        defaultNS: "translation",
        interpolation: { escapeValue: false },
        detection: {
          order: ["localStorage", "navigator", "htmlTag"],
          caches: ["localStorage"],
          lookupLocalStorage: "selectedLanguage",
        },
      });
  }
  return i18n;
}
