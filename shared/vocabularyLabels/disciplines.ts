import type { SupportedLocale, Discipline } from "../domain";

export const disciplineLabels = {
  agronomy: {
    en: "Agronomy", fr: "Agronomie", es: "Agronomía", ar: "علم المحاصيل", zh: "农学", ru: "Агрономия",
  },
  botany: {
    en: "Botany", fr: "Botanique", es: "Botánica", ar: "علم النبات", zh: "植物学", ru: "Ботаника",
  },
  chemistry: {
    en: "Chemistry", fr: "Chimie", es: "Química", ar: "الكيمياء", zh: "化学", ru: "Химия",
  },
  climatology: {
    en: "Climatology", fr: "Climatologie", es: "Climatología", ar: "علم المناخ", zh: "气候学", ru: "Климатология",
  },
  ecology: {
    en: "Ecology", fr: "Écologie", es: "Ecología", ar: "علم البيئة", zh: "生态学", ru: "Экология",
  },
  economics: {
    en: "Economics", fr: "Économie", es: "Economía", ar: "علم الاقتصاد", zh: "经济学", ru: "Экономика",
  },
  fisheries_science: {
    en: "Fisheries science", fr: "Sciences halieutiques", es: "Ciencias pesqueras", ar: "علوم المصايد", zh: "渔业科学",
    ru: "Рыбохозяйственная наука",
  },
  genetics: {
    en: "Genetics", fr: "Génétique", es: "Genética", ar: "علم الوراثة", zh: "遗传学", ru: "Генетика",
  },
  geography: {
    en: "Geography", fr: "Géographie", es: "Geografía", ar: "الجغرافيا", zh: "地理学", ru: "География",
  },
  geology: {
    en: "Geology", fr: "Géologie", es: "Geología", ar: "الجيولوجيا", zh: "地质学", ru: "Геология",
  },
  geophysics: {
    en: "Geophysics", fr: "Géophysique", es: "Geofísica", ar: "الجيوفيزياء", zh: "地球物理学", ru: "Геофизика",
  },
  glaciology: {
    en: "Glaciology", fr: "Glaciologie", es: "Glaciología", ar: "علم الجليد", zh: "冰川学", ru: "Гляциология",
  },
  hydrology: {
    en: "Hydrology", fr: "Hydrologie", es: "Hidrología", ar: "الهيدرولوجيا", zh: "水文学", ru: "Гидрология",
  },
  law: {
    en: "Law", fr: "Droit", es: "Derecho", ar: "القانون", zh: "法学", ru: "Право",
  },
  marine_biology: {
    en: "Marine biology", fr: "Biologie marine", es: "Biología marina", ar: "علم الأحياء البحرية", zh: "海洋生物学",
    ru: "Морская биология",
  },
  meteorology: {
    en: "Meteorology", fr: "Météorologie", es: "Meteorología", ar: "علم الأرصاد الجوية", zh: "气象学", ru: "Метеорология",
  },
  microbiology: {
    en: "Microbiology", fr: "Microbiologie", es: "Microbiología", ar: "علم الأحياء الدقيقة", zh: "微生物学", ru: "Микробиология",
  },
  mycology: {
    en: "Mycology", fr: "Mycologie", es: "Micología", ar: "علم الفطريات", zh: "真菌学", ru: "Микология",
  },
  oceanography: {
    en: "Oceanography", fr: "Océanographie", es: "Oceanografía", ar: "علم المحيطات", zh: "海洋学", ru: "Океанография",
  },
  paleontology: {
    en: "Paleontology", fr: "Paléontologie", es: "Paleontología", ar: "علم الأحافير", zh: "古生物学", ru: "Палеонтология",
  },
  spatial_planning: {
    en: "Spatial planning", fr: "Aménagement du territoire", es: "Ordenación del territorio", ar: "التخطيط المكاني", zh: "空间规划",
    ru: "Территориальное планирование",
  },
  taxonomy: {
    en: "Taxonomy", fr: "Taxonomie", es: "Taxonomía", ar: "علم التصنيف", zh: "分类学", ru: "Таксономия",
  },
  zoology: {
    en: "Zoology", fr: "Zoologie", es: "Zoología", ar: "علم الحيوان", zh: "动物学", ru: "Зоология",
  },
} satisfies Record<Discipline, Record<SupportedLocale, string>>;
