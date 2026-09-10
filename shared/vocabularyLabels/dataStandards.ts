import type { SupportedLocale, DataStandard } from "../domain";

export const dataStandardLabels = {
  darwin_core: {
    en: "Darwin Core", fr: "Darwin Core", es: "Darwin Core", ar: "Darwin Core", zh: "Darwin Core", ru: "Darwin Core",
  },
  emof: {
    en: "Extended MeasurementOrFact (eMoF)", fr: "Extended MeasurementOrFact (eMoF)", es: "Extended MeasurementOrFact (eMoF)",
    ar: "Extended MeasurementOrFact (eMoF)", zh: "扩展测量或事实（eMoF）", ru: "Extended MeasurementOrFact (eMoF)",
  },
  dna_derived_data: {
    en: "DNA-derived data extension", fr: "Extension des données dérivées de l’ADN", es: "Extensión de datos derivados del ADN",
    ar: "امتداد البيانات المستمدة من الحمض النووي", zh: "DNA衍生数据扩展", ru: "Расширение данных, полученных из ДНК",
  },
  humboldt_extension: {
    en: "Humboldt Extension", fr: "Extension Humboldt", es: "Extensión Humboldt", ar: "امتداد هومبولت", zh: "洪堡扩展",
    ru: "Расширение Гумбольдта",
  },
  eml: {
    en: "Ecological Metadata Language (EML)", fr: "Langage de métadonnées écologiques (EML)",
    es: "Lenguaje de Metadatos Ecológicos (EML)", ar: "لغة البيانات الوصفية البيئية (EML)", zh: "生态元数据语言（EML）",
    ru: "Язык экологических метаданных (EML)",
  },
  ggbn: {
    en: "GGBN Data Standard", fr: "Norme de données GGBN", es: "Estándar de datos GGBN", ar: "معيار بيانات GGBN", zh: "GGBN数据标准",
    ru: "Стандарт данных GGBN",
  },
  abcd: {
    en: "Access to Biological Collection Data (ABCD)", fr: "Accès aux données des collections biologiques (ABCD)",
    es: "Acceso a Datos de Colecciones Biológicas (ABCD)", ar: "الوصول إلى بيانات المجموعات البيولوجية (ABCD)",
    zh: "生物馆藏数据访问（ABCD）", ru: "Доступ к данным биологических коллекций (ABCD)",
  },
  mixs: {
    en: "Minimum Information about any Sequence (MIxS)", fr: "Informations minimales sur toute séquence (MIxS)",
    es: "Información mínima sobre cualquier secuencia (MIxS)", ar: "الحد الأدنى من المعلومات عن أي تسلسل (MIxS)",
    zh: "任何序列的最少信息（MIxS）", ru: "Минимальная информация о любой последовательности (MIxS)",
  },
  bcdm: {
    en: "Barcode Core Data Model (BCDM)", fr: "Modèle de données de référence des codes-barres (BCDM)",
    es: "Modelo de Datos Básicos de Códigos de Barras (BCDM)", ar: "نموذج البيانات الأساسية للترميز الشريطي (BCDM)",
    zh: "条形码核心数据模型（BCDM）", ru: "Базовая модель данных штрихкодов (BCDM)",
  },
  insdc: {
    en: "INSDC specifications", fr: "Spécifications INSDC", es: "Especificaciones INSDC", ar: "مواصفات INSDC", zh: "INSDC规范",
    ru: "Спецификации INSDC",
  },
  cf: {
    en: "Climate and Forecast (CF) conventions", fr: "Conventions climat et prévisions (CF)",
    es: "Convenciones de Clima y Pronóstico (CF)", ar: "اتفاقيات المناخ والتنبؤ (CF)", zh: "气候与预报（CF）约定",
    ru: "Соглашения о климате и прогнозировании (CF)",
  },
  acdd: {
    en: "Attribute Convention for Data Discovery (ACDD)", fr: "Convention d’attributs pour la découverte des données (ACDD)",
    es: "Convención de Atributos para el Descubrimiento de Datos (ACDD)", ar: "اتفاقية السمات لاكتشاف البيانات (ACDD)",
    zh: "数据发现属性约定（ACDD）", ru: "Соглашение об атрибутах для поиска данных (ACDD)",
  },
  argo: {
    en: "Argo data conventions", fr: "Conventions de données Argo", es: "Convenciones de datos Argo", ar: "اتفاقيات بيانات Argo",
    zh: "Argo数据约定", ru: "Соглашения о данных Argo",
  },
  oceansites: {
    en: "OceanSITES conventions", fr: "Conventions OceanSITES", es: "Convenciones OceanSITES", ar: "اتفاقيات OceanSITES",
    zh: "OceanSITES约定", ru: "Соглашения OceanSITES",
  },
  ioos_metadata: {
    en: "IOOS Metadata Profile", fr: "Profil de métadonnées IOOS", es: "Perfil de metadatos IOOS",
    ar: "ملف البيانات الوصفية IOOS", zh: "IOOS元数据应用规范", ru: "Профиль метаданных IOOS",
  },
  sgrid: {
    en: "SGRID conventions", fr: "Conventions SGRID", es: "Convenciones SGRID", ar: "اتفاقيات SGRID", zh: "SGRID约定",
    ru: "Соглашения SGRID",
  },
  ugrid: {
    en: "UGRID conventions", fr: "Conventions UGRID", es: "Convenciones UGRID", ar: "اتفاقيات UGRID", zh: "UGRID约定",
    ru: "Соглашения UGRID",
  },
  seadatanet: {
    en: "SeaDataNet data profiles", fr: "Profils de données SeaDataNet", es: "Perfiles de datos SeaDataNet",
    ar: "ملفات بيانات SeaDataNet", zh: "SeaDataNet数据应用规范", ru: "Профили данных SeaDataNet",
  },
  nerc_vocabularies: {
    en: "NERC/SeaDataNet vocabularies", fr: "Vocabulaires NERC/SeaDataNet", es: "Vocabularios NERC/SeaDataNet",
    ar: "مفردات NERC/SeaDataNet", zh: "NERC/SeaDataNet受控词汇", ru: "Словари NERC/SeaDataNet",
  },
  qartod: {
    en: "QARTOD", fr: "QARTOD", es: "QARTOD", ar: "QARTOD", zh: "QARTOD", ru: "QARTOD",
  },
  iso_19115: {
    en: "ISO 19115 metadata", fr: "Métadonnées ISO 19115", es: "Metadatos ISO 19115", ar: "البيانات الوصفية ISO 19115",
    zh: "ISO 19115元数据", ru: "Метаданные ISO 19115",
  },
  iso_19139: {
    en: "ISO 19139 metadata", fr: "Métadonnées ISO 19139", es: "Metadatos ISO 19139", ar: "البيانات الوصفية ISO 19139",
    zh: "ISO 19139元数据", ru: "Метаданные ISO 19139",
  },
  iso_19115_3: {
    en: "ISO 19115-3 metadata", fr: "Métadonnées ISO 19115-3", es: "Metadatos ISO 19115-3", ar: "البيانات الوصفية ISO 19115-3",
    zh: "ISO 19115-3元数据", ru: "Метаданные ISO 19115-3",
  },
  seadatanet_cdi: {
    en: "SeaDataNet CDI metadata profile", fr: "Profil de métadonnées CDI SeaDataNet",
    es: "Perfil de metadatos CDI de SeaDataNet", ar: "ملف البيانات الوصفية CDI من SeaDataNet", zh: "SeaDataNet CDI元数据应用规范",
    ru: "Профиль метаданных CDI SeaDataNet",
  },
  cioos_metadata: {
    en: "CIOOS metadata profile", fr: "Profil de métadonnées SIOOC", es: "Perfil de metadatos CIOOS",
    ar: "ملف البيانات الوصفية CIOOS", zh: "CIOOS元数据应用规范", ru: "Профиль метаданных CIOOS",
  },
  dublin_core: {
    en: "Dublin Core", fr: "Dublin Core", es: "Dublin Core", ar: "Dublin Core", zh: "Dublin Core", ru: "Dublin Core",
  },
  datacite: {
    en: "DataCite Metadata Schema", fr: "Schéma de métadonnées DataCite", es: "Esquema de Metadatos DataCite",
    ar: "مخطط البيانات الوصفية DataCite", zh: "DataCite元数据模式", ru: "Схема метаданных DataCite",
  },
  dcat: {
    en: "Data Catalog Vocabulary (DCAT)", fr: "Vocabulaire des catalogues de données (DCAT)",
    es: "Vocabulario de Catálogos de Datos (DCAT)", ar: "مفردات فهارس البيانات (DCAT)", zh: "数据目录词汇（DCAT）",
    ru: "Словарь каталогов данных (DCAT)",
  },
  dcat_ap: {
    en: "DCAT Application Profile (DCAT-AP)", fr: "Profil d’application DCAT (DCAT-AP)",
    es: "Perfil de Aplicación DCAT (DCAT-AP)", ar: "ملف تطبيق DCAT ‏(DCAT-AP)", zh: "DCAT应用规范（DCAT-AP）",
    ru: "Профиль приложения DCAT (DCAT-AP)",
  },
  schema_org: {
    en: "Schema.org", fr: "Schema.org", es: "Schema.org", ar: "Schema.org", zh: "Schema.org", ru: "Schema.org",
  },
  re3data: {
    en: "re3data metadata schema", fr: "Schéma de métadonnées re3data", es: "Esquema de metadatos re3data",
    ar: "مخطط البيانات الوصفية re3data", zh: "re3data元数据模式", ru: "Схема метаданных re3data",
  },
  dif: {
    en: "Directory Interchange Format (DIF)", fr: "Format d’échange de répertoires (DIF)",
    es: "Formato de Intercambio de Directorios (DIF)", ar: "تنسيق تبادل الأدلة (DIF)", zh: "目录交换格式（DIF）",
    ru: "Формат обмена каталогами (DIF)",
  },
  fgdc_csdgm: {
    en: "FGDC CSDGM", fr: "FGDC CSDGM", es: "FGDC CSDGM", ar: "FGDC CSDGM", zh: "FGDC CSDGM", ru: "FGDC CSDGM",
  },
  datras: {
    en: "DATRAS data model", fr: "Modèle de données DATRAS", es: "Modelo de datos DATRAS", ar: "نموذج بيانات DATRAS",
    zh: "DATRAS数据模型", ru: "Модель данных DATRAS",
  },
  intercatch: {
    en: "InterCatch data model", fr: "Modèle de données InterCatch", es: "Modelo de datos InterCatch",
    ar: "نموذج بيانات InterCatch", zh: "InterCatch数据模型", ru: "Модель данных InterCatch",
  },
  rdbes: {
    en: "RDBES data model", fr: "Modèle de données RDBES", es: "Modelo de datos RDBES", ar: "نموذج بيانات RDBES", zh: "RDBES数据模型",
    ru: "Модель данных RDBES",
  },
  ices_vocabularies: {
    en: "ICES controlled vocabularies", fr: "Vocabulaires contrôlés ICES", es: "Vocabularios controlados ICES",
    ar: "المفردات المضبوطة ICES", zh: "ICES受控词汇", ru: "Контролируемые словари ICES",
  },
  asfis: {
    en: "ASFIS species classification", fr: "Classification des espèces ASFIS", es: "Clasificación de especies ASFIS",
    ar: "تصنيف الأنواع ASFIS", zh: "ASFIS物种分类", ru: "Классификация видов ASFIS",
  },
  isscaap: {
    en: "ISSCAAP", fr: "ISSCAAP", es: "ISSCAAP", ar: "ISSCAAP", zh: "ISSCAAP", ru: "ISSCAAP",
  },
  isscfg: {
    en: "ISSCFG", fr: "ISSCFG", es: "ISSCFG", ar: "ISSCFG", zh: "ISSCFG", ru: "ISSCFG",
  },
  fao_fishing_areas: {
    en: "FAO fishing areas", fr: "Zones de pêche de la FAO", es: "Áreas de pesca de la FAO",
    ar: "مناطق الصيد التابعة لمنظمة الأغذية والزراعة", zh: "粮农组织捕捞区域", ru: "Рыболовные районы ФАО",
  },
} satisfies Record<DataStandard, Record<SupportedLocale, string>>;
