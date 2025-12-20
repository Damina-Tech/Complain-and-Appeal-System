"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

type Language = {
  code: "en" | "am" | "om";
  name: string;
  nativeName: string;
};

const languages: Language[] = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "am", name: "Amharic", nativeName: "አማርኛ" },
  { code: "om", name: "Oromo", nativeName: "Afaan Oromoo" },
];

export function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentLanguage, changeLanguage } = useTranslation();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(
    languages.find((l) => l.code === currentLanguage) || languages[0]
  );

  // Sync with current language changes
  useEffect(() => {
    const lang = languages.find((l) => l.code === currentLanguage);
    if (lang && lang.code !== selectedLanguage.code) {
      setSelectedLanguage(lang);
    }
  }, [currentLanguage, selectedLanguage.code]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleLanguageChange = async (language: Language) => {
    setSelectedLanguage(language);
    changeLanguage(language.code);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark-4 transition-colors hover:bg-primary/10 hover:border-primary hover:text-primary dark:border-stroke-dark dark:bg-dark-2 dark:text-dark-6 dark:hover:bg-primary/20 dark:hover:border-primary dark:hover:text-primary"
        aria-label="Select language"
        aria-expanded={isOpen}
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
