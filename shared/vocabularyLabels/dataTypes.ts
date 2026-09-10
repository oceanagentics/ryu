import type { SupportedLocale, DataType } from "../domain";

export const dataTypeLabels = {
  taxonomic_records: {
    en: "Taxonomic records", fr: "Registres taxonomiques", es: "Registros taxonómicos", ar: "سجلات التصنيف", zh: "分类记录",
    ru: "Таксономические записи",
  },
  occurrence_records: {
    en: "Occurrence records", fr: "Données d’occurrence", es: "Registros de presencia", ar: "سجلات التواجد", zh: "物种出现记录",
    ru: "Записи о находках организмов",
  },
  survey_records: {
    en: "Survey records", fr: "Données de relevés", es: "Registros de muestreo", ar: "سجلات المسح", zh: "调查记录",
    ru: "Данные обследований",
  },
  biological_traits: {
    en: "Biological traits", fr: "Traits biologiques", es: "Rasgos biológicos", ar: "السمات البيولوجية", zh: "生物性状",
    ru: "Биологические признаки",
  },
  biological_interactions: {
    en: "Biological interactions", fr: "Interactions biologiques", es: "Interacciones biológicas", ar: "التفاعلات البيولوجية",
    zh: "生物相互作用", ru: "Биологические взаимодействия",
  },
  sample_records: {
    en: "Sample records", fr: "Registres d’échantillons", es: "Registros de muestras", ar: "سجلات العينات", zh: "样本记录",
    ru: "Записи об образцах",
  },
  sequence_data: {
    en: "Sequence data", fr: "Données de séquences", es: "Datos de secuencias", ar: "بيانات التسلسلات", zh: "序列数据",
    ru: "Данные последовательностей",
  },
  environmental_measurements: {
    en: "Environmental measurements", fr: "Mesures environnementales", es: "Mediciones ambientales", ar: "القياسات البيئية",
    zh: "环境测量数据", ru: "Измерения параметров среды",
  },
  model_outputs: {
    en: "Model outputs", fr: "Résultats de modèles", es: "Resultados de modelos", ar: "مخرجات النماذج", zh: "模型输出",
    ru: "Результаты моделирования",
  },
  fisheries_statistics: {
    en: "Fisheries statistics", fr: "Statistiques halieutiques", es: "Estadísticas pesqueras", ar: "إحصاءات مصايد الأسماك",
    zh: "渔业统计", ru: "Статистика рыболовства",
  },
  geographic_reference_data: {
    en: "Geographic reference data", fr: "Données géographiques de référence", es: "Datos geográficos de referencia",
    ar: "البيانات المرجعية الجغرافية", zh: "地理参考数据", ru: "Географические справочные данные",
  },
  bathymetry: {
    en: "Bathymetry", fr: "Bathymétrie", es: "Batimetría", ar: "قياسات الأعماق", zh: "水深数据", ru: "Батиметрия",
  },
  platform_records: {
    en: "Platform records", fr: "Registres de plateformes", es: "Registros de plataformas", ar: "سجلات منصات الرصد", zh: "观测平台记录",
    ru: "Записи о платформах наблюдений",
  },
  media: {
    en: "Media", fr: "Médias", es: "Medios", ar: "الوسائط", zh: "媒体", ru: "Медиа",
  },
  bibliographic_records: {
    en: "Bibliographic records", fr: "Notices bibliographiques", es: "Registros bibliográficos", ar: "السجلات الببليوغرافية",
    zh: "文献目录记录", ru: "Библиографические записи",
  },
  catalogue_records: {
    en: "Catalogue records", fr: "Notices de catalogue", es: "Registros de catálogo", ar: "سجلات الفهرسة", zh: "目录记录",
    ru: "Записи каталогов",
  },
  documents: {
    en: "Documents", fr: "Documents", es: "Documentos", ar: "الوثائق", zh: "文档", ru: "Документы",
  },
  software: {
    en: "Software", fr: "Logiciels", es: "Software", ar: "البرمجيات", zh: "软件", ru: "Программное обеспечение",
  },
} satisfies Record<DataType, Record<SupportedLocale, string>>;
