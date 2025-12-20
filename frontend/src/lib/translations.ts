// DEPRECATED: This file is kept for backward compatibility only
// DO NOT USE - Use the new translation system from @/lib/translations/index instead
// New translations are in frontend/src/lib/translations/index.ts
// Please use the new translation system with hooks/useTranslation.ts

// Note: This file should not import from translations/index to avoid circular dependencies
// This file exports an old translation system that is being phased out

type Translations = {
  [key: string]: {
    en: string;
    am: string;
    ha: string;
    om?: string;
  };
};

export const translations: Translations = {
  // Dashboard
  "dashboard": {
    en: "Dashboard",
    am: "ዳሽቦርድ",
    ha: "ዳሽቦርድ",
    om: "Daashboordii",
  },
  "role": {
    en: "Role",
    am: "ሚና",
    ha: "ሚና",
    om: "Gahee",
  },
  "search": {
    en: "Search",
    am: "ፈልግ",
    ha: "ፈልግ",
    om: "Barbaadi",
  },
  
  // Navigation
  "signIn": {
    en: "Sign In",
    am: "ግባ",
    ha: "ግባ",
    om: "Seeni",
  },
  "signUp": {
    en: "Sign Up",
    am: "ይመዝገቡ",
    ha: "ይመዝገቡ",
    om: "Galmaa'i",
  },
  
  // Cases
  "complaintsAndAppeals": {
    en: "Complaints & Appeals",
    am: "ያሰተላለፉ እና ጥያቄዎች",
    ha: "ያሰተላለፉ እና ጥያቄዎች",
    om: "komii fi iyyannoo",
  },
  "addNew": {
    en: "Add New",
    am: "አዲስ ጨምር",
    ha: "አዲስ ጨምር",
    om: "Haaraa dabaluu",
  },
  "title": {
    en: "Title",
    am: "ርዕስ",
    ha: "ርዕስ",
    om: "Mata-duree",
  },
  "description": {
    en: "Description",
    am: "መግለጫ",
    ha: "መግለጫ",
    om: "Ibsa",
  },
  "category": {
    en: "Category",
    am: "ምድብ",
    ha: "ምድብ",
    om: "Gosa",
  },
  "status": {
    en: "Status",
    am: "ሁኔታ",
    ha: "ሁኔታ",
    om: "Haala",
  },
  "pending": {
    en: "Pending",
    am: "በመጠበቅ ላይ",
    ha: "በመጠበቅ ላይ",
    om: "Eeggataa",
  },
  "inInvestigation": {
    en: "In Investigation",
    am: "በመመርመር ላይ",
    ha: "በመመርመር ላይ",
    om: "Qo'annoo keessa",
  },
  "resolved": {
    en: "Resolved",
    am: "ተፈትቷል",
    ha: "ተፈትቷል",
    om: "Furame",
  },
  "rejected": {
    en: "Rejected",
    am: "ውድቅ ተደርጎታል",
    ha: "ውድቅ ተደርጎታል",
    om: "Dhoofame",
  },
  "closed": {
    en: "Closed",
    am: "ዘግቷል",
    ha: "ዘግቷል",
    om: "Cufame",
  },
  
  // Homepage
  "getStarted": {
    en: "Get Started",
    am: "ጀምር",
    ha: "ጀምር",
    om: "Jalqabi",
  },
  "learnMore": {
    en: "Learn More",
    am: "ተጨማሪ ይወቁ",
    ha: "ተጨማሪ ይወቁ",
    om: "Dabalata baradhu",
  },
  "fasterWayToHandle": {
    en: "A faster way to handle",
    am: "የማስተናገድ ፈጣን መንገድ",
    ha: "የማስተናገድ ፈጣን መንገድ",
    om: "Too'achuu karaa saffisaa",
  },
  "complaintsAndAppealsText": {
    en: "complaints & appeals",
    am: "ያሰተላለፉ እና ጥያቄዎች",
    ha: "ያሰተላለፉ እና ጥያቄዎች",
    om: "komii fi iyyannoo",
  },
  "paperProcessesModernized": {
    en: "Paper processes—modernized. Submit, track, transfer, and resolve cases across offices with clear accountability and timely reports.",
    am: "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
    ha: "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
    om: "Adeemsi gabatee waraaqaa haalaan taasifame. Dhimmoota galmeessi, hordofi, dabarsi, fi baji'aa gabaasa yeroon waliin furadhu.",
  },
};

// Legacy function - kept for backward compatibility
// DO NOT USE - Use the new getTranslation from translations/index.ts instead
export function getTranslation(key: string, language: string = "en"): string {
  console.warn(`Legacy getTranslation called with key: ${key}. Please use the new translation system from hooks/useTranslation.ts`);
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }
  
  // Map 'ha' to 'am' for backward compatibility
  const lang = language === "ha" ? "am" : language;
  return translation[lang as keyof typeof translation] || translation.en;
}

// Legacy hook - use the new useTranslation from hooks/useTranslation.ts instead
export function useTranslation() {
  const getCurrentLanguage = (): string => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("selectedLanguage") || "en";
  };

  const t = (key: string): string => {
    const language = getCurrentLanguage();
    return getTranslation(key, language);
  };

  return { t, getCurrentLanguage };
}
