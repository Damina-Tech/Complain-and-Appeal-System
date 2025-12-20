"use client";

import { useMemo, useState, useEffect } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";
import { getTranslation, translations } from "@/lib/translations/index";

type TranslationNamespace = keyof typeof translations;

/**
 * Custom translation hook that provides type-safe translations
 * Usage: const { t, currentLanguage } = useTranslation();
 * t('common', 'save') or t('dashboard', 'welcome')
 * 
 * This hook automatically re-renders components when the language changes
 * because it uses react-i18next's useTranslation hook which is reactive.
 */
export function useTranslation() {
  // This hook from react-i18next automatically triggers re-renders when language changes
  const { i18n, ready } = useI18nextTranslation();
  
  // Use state to force re-renders when language changes
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "am" | "om">(() => {
    const lang = (i18n.language || "en") as "en" | "am" | "om";
    return (lang === "en" || lang === "am" || lang === "om") ? lang : "en";
  });

  // Listen to i18n language changes and update state
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      const lang = (lng || "en") as "en" | "am" | "om";
      if (lang === "en" || lang === "am" || lang === "om") {
        setCurrentLanguage(lang);
      } else {
        setCurrentLanguage("en");
      }
    };

    // Set initial language
    const lang = (i18n.language || "en") as "en" | "am" | "om";
    if (lang === "en" || lang === "am" || lang === "om") {
      setCurrentLanguage(lang);
    }

    // Listen to language changes
    i18n.on("languageChanged", handleLanguageChanged);

    return () => {
      i18n.off("languageChanged", handleLanguageChanged);
    };
  }, [i18n]);

  // Create translation function - this will be recreated when currentLanguage changes
  const t = useMemo(
    () => (namespace: TranslationNamespace, key: string): string => {
      // Verify we have the correct translations object
      if (!translations[namespace]) {
        console.error(
          `[useTranslation] Namespace "${namespace}" not found. Available namespaces:`, 
          Object.keys(translations)
        );
        return `${namespace}.${key}`;
      }
      return getTranslation(namespace, key, currentLanguage);
    },
    [currentLanguage]
  );

  return {
    t,
    currentLanguage,
    ready,
    changeLanguage: (lang: "en" | "am" | "om") => {
      i18n.changeLanguage(lang).then(() => {
        setCurrentLanguage(lang);
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedLanguage", lang);
        }
      });
    },
  };
}

