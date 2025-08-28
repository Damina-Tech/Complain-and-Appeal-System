import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

const resources = {
  en: {
    translation: {
      home: "Home",
      about: "About",
      services: "Services",
      contact: "Contact",
      signIn: "Sign In",
      signUp: "Sign Up",
      dashboard: "Dashboard",
      role: "Role",
      search: "Search",
      fasterWayToHandle: "A faster way to handle",
      complaintsAndAppealsText: "complaints & appeals",
      paperProcessesModernized:
        "Paper processes—modernized. Submit, track, transfer, and resolve cases across offices with clear accountability and timely reports.",
      getStarted: "Get Started",
      learnMore: "Learn More",
    },
  },
  am: {
    translation: {
      home: "የመነሻ ገጽ",
      about: "ስለ",
      services: "አገልግሎቶች",
      contact: "አድራሻ",
      signIn: "ግባ",
      signUp: "ይመዝገቡ",
      dashboard: "ዳሽቦርድ",
      role: "ሚና",
      search: "ፈልግ",
      fasterWayToHandle: "የማስተናገድ ፈጣን መንገድ",
      complaintsAndAppealsText: "ያሰተላለፉ እና ጥያቄዎች",
      paperProcessesModernized:
        "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
      getStarted: "ጀምር",
      learnMore: "ተጨማሪ ይወቁ",
    },
  },
  ha: {
    translation: {
      home: "የመነሻ ገጽ",
      about: "ስለ",
      services: "አገልግሎቶች",
      contact: "አድራሻ",
      signIn: "ግባ",
      signUp: "ይመዝገቡ",
      dashboard: "ዳሽቦርድ",
      role: "ሚና",
      search: "ፈልግ",
      fasterWayToHandle: "የማስተናገድ ፈጣን መንገድ",
      complaintsAndAppealsText: "ያሰተላለፉ እና ጥያቄዎች",
      paperProcessesModernized:
        "የወረቀት ሂደቶች—ዘመናዊ ሆነው። ጉዳዮችን በግልጽ ኃላፊነት እና በወቅቱ ሪፖርቶች በተለያዩ ጽህፈት ቤቶች ያስገቡ፣ ያሳዩ፣ ያዛውሩ እና ያፈቱ።",
      getStarted: "ጀምር",
      learnMore: "ተጨማሪ ይወቁ",
    },
  },
};

export function initI18n() {
  if (!i18n.isInitialized) {
    i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources,
        fallbackLng: "en",
        supportedLngs: ["en", "am", "ha"],
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
