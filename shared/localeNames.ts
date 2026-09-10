import type { SupportedLocale } from "./domain";

export const localeNames = {
  en: {
    en: "English", fr: "anglais", es: "inglés", ar: "الإنجليزية", zh: "英语", ru: "английский",
  },
  fr: {
    en: "French", fr: "français", es: "francés", ar: "الفرنسية", zh: "法语", ru: "французский",
  },
  es: {
    en: "Spanish", fr: "espagnol", es: "español", ar: "الإسبانية", zh: "西班牙语", ru: "испанский",
  },
  ar: {
    en: "Arabic", fr: "arabe", es: "árabe", ar: "العربية", zh: "阿拉伯语", ru: "арабский",
  },
  zh: {
    en: "Chinese", fr: "chinois", es: "chino", ar: "الصينية", zh: "中文", ru: "китайский",
  },
  ru: {
    en: "Russian", fr: "russe", es: "ruso", ar: "الروسية", zh: "俄语", ru: "русский",
  },
} satisfies Record<SupportedLocale, Record<SupportedLocale, string>>;

export const localeNativeNames = {
  "ar": "العربية",
  "zh": "中文",
  "en": "English",
  "fr": "Français",
  "ru": "Русский",
  "es": "Español"
} satisfies Record<SupportedLocale, string>;
