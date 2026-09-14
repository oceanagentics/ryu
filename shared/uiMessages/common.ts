import type { SupportedLocale } from "../domain";

export const commonMessages = {
  "app.title": {
    en: "Explorer", fr: "Explorateur", es: "Explorador", ar: "المستكشف", zh: "探索器", ru: "Обозреватель",
  },
  "app.loadingGraphData": {
    en: "Loading graph data...", fr: "Chargement des données du graphe...", es: "Cargando datos del grafo...",
    ar: "جار تحميل بيانات الرسم البياني...", zh: "正在加载图谱数据...", ru: "Загрузка данных графа...",
  },
  "app.loading3dView": {
    en: "Loading 3D view...", fr: "Chargement de la vue 3D...", es: "Cargando vista 3D...",
    ar: "جار تحميل العرض ثلاثي الأبعاد...", zh: "正在加载 3D 视图...", ru: "Загрузка 3D-представления...",
  },
  "app.graphLoadFailed": {
    en: "Graph load failed", fr: "Échec du chargement du graphe", es: "Error al cargar el grafo", ar: "فشل تحميل الرسم البياني",
    zh: "图谱加载失败", ru: "Не удалось загрузить граф",
  },
  "app.language": {
    en: "Language", fr: "Langue", es: "Idioma", ar: "اللغة", zh: "语言", ru: "Язык",
  },
  "app.graphView": {
    en: "Graph view", fr: "Vue du graphe", es: "Vista del grafo", ar: "عرض الرسم البياني", zh: "图谱视图", ru: "Представление графа",
  },
  "app.openGraphPaneInView": {
    en: "Open graph pane in {view} view", fr: "Ouvrir le panneau graphe en vue {view}",
    es: "Abrir el panel de grafo en vista {view}", ar: "افتح لوحة الرسم البياني في عرض {view}", zh: "以{view}视图打开图谱面板",
    ru: "Открыть панель графа в представлении {view}",
  },
  "app.expandPane": {
    en: "Expand {pane} pane", fr: "Agrandir le panneau {pane}", es: "Expandir el panel {pane}", ar: "وسّع لوحة {pane}",
    zh: "展开{pane}面板", ru: "Развернуть панель {pane}",
  },
  "app.closePane": {
    en: "Close {pane} pane", fr: "Fermer le panneau {pane}", es: "Cerrar el panel {pane}", ar: "أغلق لوحة {pane}",
    zh: "关闭{pane}面板", ru: "Закрыть панель {pane}",
  },
  "app.resizePane": {
    en: "Resize {pane} pane", fr: "Redimensionner le panneau {pane}", es: "Redimensionar el panel {pane}",
    ar: "غيّر حجم لوحة {pane}", zh: "调整{pane}面板大小", ru: "Изменить размер панели {pane}",
  },
  "app.openPane": {
    en: "Open {pane} pane", fr: "Ouvrir le panneau {pane}", es: "Abrir el panel {pane}", ar: "افتح لوحة {pane}", zh: "打开{pane}面板",
    ru: "Открыть панель {pane}",
  },
  "app.openPaneTitle": {
    en: "Open {pane}", fr: "Ouvrir {pane}", es: "Abrir {pane}", ar: "افتح {pane}", zh: "打开{pane}", ru: "Открыть {pane}",
  },
  "app.expandPaneTitle": {
    en: "Expand pane", fr: "Agrandir le panneau", es: "Expandir panel", ar: "وسّع اللوحة", zh: "展开面板", ru: "Развернуть панель",
  },
  "app.paneAlreadyExpanded": {
    en: "Pane is already expanded", fr: "Le panneau est déjà agrandi", es: "El panel ya está expandido",
    ar: "اللوحة موسّعة بالفعل", zh: "面板已展开", ru: "Панель уже развернута",
  },
  "app.closeDetailsTitle": {
    en: "Close details", fr: "Fermer les détails", es: "Cerrar detalles", ar: "أغلق التفاصيل", zh: "关闭详情", ru: "Закрыть детали",
  },
  "app.closePaneTitle": {
    en: "Close pane", fr: "Fermer le panneau", es: "Cerrar panel", ar: "أغلق اللوحة", zh: "关闭面板", ru: "Закрыть панель",
  },
  "common.notRecorded": {
    en: "Not recorded", fr: "Non renseigné", es: "No registrado", ar: "غير مسجل", zh: "未记录", ru: "Не указано",
  },
  "common.noLocalization": {
    en: "No localization", fr: "Aucune localisation", es: "Sin localización", ar: "لا توجد ترجمة محلية", zh: "无本地化内容",
    ru: "Нет локализации",
  },
  "common.showingLocale": {
    en: "Showing {locale}", fr: "Affichage en {locale}", es: "Mostrando {locale}", ar: "يعرض {locale}", zh: "显示{locale}",
    ru: "Показан язык {locale}",
  },
  "common.missingLocale": {
    en: "Missing {locale}", fr: "{locale} manquant", es: "Falta {locale}", ar: "{locale} مفقودة", zh: "缺少{locale}",
    ru: "Нет {locale}",
  },
  "common.source": {
    en: "Source", fr: "Source", es: "Fuente", ar: "المصدر", zh: "来源", ru: "Источник",
  },
  "common.observed": {
    en: "observed {date}", fr: "observé le {date}", es: "observado el {date}", ar: "رُصد في {date}", zh: "观测于 {date}",
    ru: "наблюдалось {date}",
  },
  "app.pane.search": {
    en: "Search", fr: "Recherche", es: "Búsqueda", ar: "بحث", zh: "搜索", ru: "Поиск",
  },
  "app.pane.graph": {
    en: "Graph", fr: "Graphe", es: "Grafo", ar: "رسم بياني", zh: "图谱", ru: "Граф",
  },
  "app.pane.details": {
    en: "Details", fr: "Détails", es: "Detalles", ar: "تفاصيل", zh: "详情", ru: "Детали",
  },
} satisfies Record<string, Record<SupportedLocale, string>>;
