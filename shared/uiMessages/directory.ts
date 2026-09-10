import type { SupportedLocale } from "../domain";

export const directoryMessages = {
  "directory.noneRecorded": {
    en: "None recorded", fr: "Rien de renseigné", es: "Nada registrado", ar: "لا شيء مسجل", zh: "未记录", ru: "Ничего не указано",
  },
  "directory.system": {
    en: "System", fr: "Système", es: "Sistema", ar: "النظام", zh: "系统", ru: "Система",
  },
  "directory.operator": {
    en: "Operator", fr: "Opérateur", es: "Operador", ar: "المشغّل", zh: "运营方", ru: "Оператор",
  },
  "directory.localization": {
    en: "Localization", fr: "Localisation", es: "Localización", ar: "الترجمة المحلية", zh: "本地化", ru: "Локализация",
  },
  "directory.data": {
    en: "Data", fr: "Données", es: "Datos", ar: "البيانات", zh: "数据", ru: "Данные",
  },
  "directory.access": {
    en: "Access", fr: "Accès", es: "Acceso", ar: "الوصول", zh: "访问", ru: "Доступ",
  },
  "directory.unknown": {
    en: "Unknown", fr: "Inconnu", es: "Desconocido", ar: "غير معروف", zh: "未知", ru: "Неизвестно",
  },
  "directory.notSet": {
    en: "Not set", fr: "Non défini", es: "Sin definir", ar: "غير مضبوط", zh: "未设置", ru: "Не задано",
  },
  "directory.systems": {
    en: "Systems", fr: "Systèmes", es: "Sistemas", ar: "الأنظمة", zh: "系统", ru: "Системы",
  },
  "directory.systemCount": {
    en: "{filtered} of {total} systems", fr: "{filtered} sur {total} systèmes", es: "{filtered} de {total} sistemas",
    ar: "{filtered} من {total} نظام", zh: "{filtered} / {total} 个系统", ru: "{filtered} из {total} систем",
  },
  "directory.cards": {
    en: "Cards", fr: "Cartes", es: "Tarjetas", ar: "بطاقات", zh: "卡片", ru: "Карточки",
  },
  "directory.table": {
    en: "Table", fr: "Tableau", es: "Tabla", ar: "جدول", zh: "表格", ru: "Таблица",
  },
  "directory.searchPlaceholder": {
    en: "Search nodes, data types, access, sources", fr: "Rechercher des noeuds, types de données, accès, sources",
    es: "Buscar nodos, tipos de datos, acceso, fuentes", ar: "ابحث في العقد وأنواع البيانات والوصول والمصادر",
    zh: "搜索节点、数据类型、访问、来源", ru: "Поиск узлов, типов данных, доступа, источников",
  },
  "directory.displayed": {
    en: "Displayed", fr: "Affiché", es: "Mostrado", ar: "المعروض", zh: "当前显示", ru: "Показанные",
  },
  "directory.allLanguages": {
    en: "All languages", fr: "Toutes les langues", es: "Todos los idiomas", ar: "كل اللغات", zh: "所有语言", ru: "Все языки",
  },
  "directory.filters": {
    en: "Filters", fr: "Filtres", es: "Filtros", ar: "عوامل التصفية", zh: "筛选", ru: "Фильтры",
  },
  "directory.filtersCount": {
    en: "Filters ({count})", fr: "Filtres ({count})", es: "Filtros ({count})", ar: "عوامل التصفية ({count})", zh: "筛选 ({count})",
    ru: "Фильтры ({count})",
  },
  "directory.reset": {
    en: "Reset", fr: "Réinitialiser", es: "Restablecer", ar: "إعادة ضبط", zh: "重置", ru: "Сбросить",
  },
  "directory.languageCoverage": {
    en: "Language coverage", fr: "Couverture linguistique", es: "Cobertura de idioma", ar: "تغطية اللغة", zh: "语言覆盖",
    ru: "Языковое покрытие",
  },
  "directory.reviewStatus": {
    en: "Review status", fr: "État de révision", es: "Estado de revisión", ar: "حالة المراجعة", zh: "审核状态",
    ru: "Состояние проверки",
  },
  "directory.accessTypes": {
    en: "Access types", fr: "Types d'accès", es: "Tipos de acceso", ar: "أنواع الوصول", zh: "访问类型", ru: "Типы доступа",
  },
  "directory.accessMethods": {
    en: "Access methods", fr: "Méthodes d'accès", es: "Métodos de acceso", ar: "طرق الوصول", zh: "访问方式", ru: "Способы доступа",
  },
  "directory.noSystemsMatch": {
    en: "No systems match the current search and filters.",
    fr: "Aucun système ne correspond à la recherche et aux filtres actuels.",
    es: "Ningún sistema coincide con la búsqueda y los filtros actuales.",
    ar: "لا توجد أنظمة تطابق البحث وعوامل التصفية الحالية.", zh: "没有系统符合当前搜索和筛选条件。",
    ru: "Нет систем, соответствующих текущему поиску и фильтрам.",
  },
  "directory.unknownOperator": {
    en: "Unknown operator", fr: "Opérateur inconnu", es: "Operador desconocido", ar: "مشغّل غير معروف", zh: "未知运营方",
    ru: "Неизвестный оператор",
  },
  "directory.noDiscipline": {
    en: "No discipline", fr: "Aucune discipline", es: "Sin disciplina", ar: "لا يوجد تخصص", zh: "无学科", ru: "Нет дисциплины",
  },
  "directory.relationshipCount": {
    en: "{count} relationships", fr: "{count} relations", es: "{count} relaciones", ar: "{count} علاقات", zh: "{count} 个关系",
    ru: "{count} связей",
  },
  "directory.sourceCount": {
    en: "{count} sources", fr: "{count} sources", es: "{count} fuentes", ar: "{count} مصادر", zh: "{count} 个来源",
    ru: "{count} источников",
  },
  "directory.dataClaim.type": {
    en: "Data types", fr: "Types de données", es: "Tipos de datos", ar: "أنواع البيانات", zh: "数据类型", ru: "Типы данных",
  },
  "directory.dataClaim.format": {
    en: "Data formats", fr: "Formats de données", es: "Formatos de datos", ar: "صيغ البيانات", zh: "数据格式", ru: "Форматы данных",
  },
  "directory.dataClaim.standard": {
    en: "Data standards", fr: "Normes de données", es: "Estándares de datos", ar: "معايير البيانات", zh: "数据标准",
    ru: "Стандарты данных",
  },
  "directory.localizationCoverage.current_locale": {
    en: "Current language only", fr: "Langue actuelle uniquement", es: "Solo idioma actual", ar: "اللغة الحالية فقط", zh: "仅当前语言",
    ru: "Только текущий язык",
  },
  "directory.localizationCoverage.missing_current_locale": {
    en: "Missing current language", fr: "Langue actuelle manquante", es: "Falta el idioma actual", ar: "اللغة الحالية مفقودة",
    zh: "缺少当前语言", ru: "Текущий язык отсутствует",
  },
} satisfies Record<string, Record<SupportedLocale, string>>;
