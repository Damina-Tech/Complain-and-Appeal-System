"use client";

import { useState, useEffect } from "react";
import i18n from "i18next";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

type Language = {
  code: string;
  name: string;
  nativeName: string;
};

const languages: Language[] = [
  { code: "en", name: "English", nativeName: "h" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "om", name: "Oromo", nativeName: "Afaan Oromoo" },
];

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(languages[0]);

  useEffect(() => {
    // Load saved language preference from localStorage
    const savedLanguage = localStorage.getItem("selectedLanguage");
    if (savedLanguage) {
      const lang = languages.find(l => l.code === savedLanguage);
      if (lang) {
        setSelectedLanguage(lang);
      }
    }
  }, []);

  const handleLanguageChange = (language: Language) => {
    setSelectedLanguage(language);
    localStorage.setItem("selectedLanguage", language.code);
    setIsOpen(false);
    i18n.changeLanguage(language.code);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark-4 transition-colors hover:bg-primary/10 hover:border-primary hover:text-primary dark:border-stroke-dark dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-primary/20 dark:hover:border-primary dark:hover:text-primary"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{selectedLanguage.name}</span>
        <span className="sm:hidden">{selectedLanguage.code.toUpperCase()}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-stroke bg-white py-1 shadow-lg dark:border-stroke-dark dark:bg-gray-dark">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language)}
              className={cn(
                "flex w-full items-center justify-between px-3 py-2 text-sm transition-colors hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary",
                selectedLanguage.code === language.code && "bg-primary/15 text-primary dark:bg-primary/20 dark:text-primary"
              )}
            >
              <div className="flex flex-col items-start">
                <span className="font-medium text-gray-900 dark:text-white">
                  {language.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {language.nativeName}
                </span>
              </div>
              {selectedLanguage.code === language.code && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
