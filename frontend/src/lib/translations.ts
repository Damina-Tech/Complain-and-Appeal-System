type Translations = {
  [key: string]: {
    en: string;
    am: string;
    ha: string;
  };
};

export const translations: Translations = {
  // Dashboard
  "dashboard": {
    en: "Dashboard",
    am: "ዳሽቦርድ",
    ha: "ዳሽቦርድ",
  },
  "role": {
    en: "Role",
    am: "ሚና",
    ha: "ሚና",
  },
  "search": {
    en: "Search",
    am: "ፈልግ",
    ha: "ፈልግ",
  },
  
  // Navigation
  "home": {
    en: "Home",
    am: "የመነሻ ገጽ",
    ha: "የመነሻ ገጽ",
  },
  "about": {
    en: "About",
    am: "ስለ",
    ha: "ስለ",
  },
  "services": {
    en: "Services",
    am: "አገልግሎቶች",
    ha: "አገልግሎቶች",
  },
  "contact": {
    en: "Contact",
    am: "አድራሻ",
    ha: "አድራሻ",
  },
  "signIn": {
    en: "Sign In",
    am: "ግባ",
    ha: "ግባ",
  },
  "signUp": {
    en: "Sign Up",
    am: "ይመዝገቡ",
    ha: "ይመዝገቡ",
  },
  
  // Cases
  "complaintsAndAppeals": {
    en: "Complaints & Appeals",
    am: "ያሰተላለፉ እና ጥያቄዎች",
    ha: "ያሰተላለፉ እና ጥያቄዎች",
  },
  "addNew": {
    en: "Add New",
    am: "አዲስ ጨምር",
    ha: "አዲስ ጨምር",
  },
  "title": {
    en: "Title",
    am: "ርዕስ",
    ha: "ርዕስ",
  },
  "description": {
    en: "Description",
    am: "መግለጫ",
    ha: "መግለጫ",
  },
  "category": {
    en: "Category",
    am: "ምድብ",
    ha: "ምድብ",
  },
  "status": {
    en: "Status",
    am: "ሁኔታ",
    ha: "ሁኔታ",
  },
  "pending": {
    en: "Pending",
    am: "በመጠበቅ ላይ",
    ha: "በመጠበቅ ላይ",
  },
  "inInvestigation": {
    en: "In Investigation",
    am: "በመመርመር ላይ",
    ha: "በመመርመር ላይ",
  },
  "resolved": {
    en: "Resolved",
    am: "ተፈትቷል",
    ha: "ተፈትቷል",
  },
  "rejected": {
    en: "Rejected",
    am: "ውድቅ ተደርጎታል",
    ha: "ውድቅ ተደርጎታል",
  },
  "closed": {
    en: "Closed",
    am: "ዘግቷል",
    ha: "ዘግቷል",
  },
  
  // Homepage
  "getStarted": {
    en: "Get Started",
    am: "ጀምር",
    ha: "ጀምር",
  },
  "learnMore": {
    en: "Learn More",
    am: "ተጨማሪ ይወቁ",
    ha: "ተጨማሪ ይወቁ",
  },
  "fasterWayToHandle": {
    en: "A faster way to handle",
    am: "የማስተናገድ ፈጣን መንገድ",
    ha: "የማስተናገድ ፈጣን መንገድ",
  },
  "complaintsAndAppealsText": {
    en: "complaints & appeals",
    am: "ያሰተላለፉ እና ጥያቄዎች",
    ha: "ያሰተላለፉ እና ጥያቄዎች",
  },
  "paperProcessesModernized": {
    en: "Paper processes—modernized. Submit, track, transfer, and resolve cases across offices with clear accountability and timely reports.",
    am: "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
    ha: "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
  },
};

export function getTranslation(key: string, language: string = "en"): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation not found for key: ${key}`);
    return key;
  }
  
  return translation[language as keyof typeof translation] || translation.en;
}

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
