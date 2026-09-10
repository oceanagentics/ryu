import type { SupportedLocale } from "../domain";

export const searchMessages = {
  "search.field.name": {
    en: "Name", fr: "Nom", es: "Nombre", ar: "الاسم", zh: "名称", ru: "Название",
  },
  "search.field.nodeType": {
    en: "Node type", fr: "Type de noeud", es: "Tipo de nodo", ar: "نوع العقدة", zh: "节点类型", ru: "Тип узла",
  },
  "search.field.country": {
    en: "Country", fr: "Pays", es: "País", ar: "البلد", zh: "国家", ru: "Страна",
  },
  "search.field.connectedNode": {
    en: "Connected node", fr: "Noeud connecté", es: "Nodo conectado", ar: "عقدة متصلة", zh: "连接节点", ru: "Связанный узел",
  },
  "search.field.relationship": {
    en: "Relationship", fr: "Relation", es: "Relación", ar: "العلاقة", zh: "关系", ru: "Связь",
  },
  "search.field.relationshipNote": {
    en: "Relationship note", fr: "Note de relation", es: "Nota de relación", ar: "ملاحظة العلاقة", zh: "关系备注",
    ru: "Заметка о связи",
  },
  "search.field.containedNode": {
    en: "Contained node", fr: "Noeud contenu", es: "Nodo contenido", ar: "عقدة محتواة", zh: "包含节点", ru: "Содержащийся узел",
  },
  "search.field.operator": {
    en: "Operator", fr: "Opérateur", es: "Operador", ar: "المشغّل", zh: "运营方", ru: "Оператор",
  },
  "search.field.alias": {
    en: "Alias", fr: "Alias", es: "Alias", ar: "اسم بديل", zh: "别名", ru: "Альтернативное название",
  },
  "search.field.discipline": {
    en: "Disciplines", fr: "Disciplines", es: "Disciplinas", ar: "التخصصات", zh: "学科", ru: "Дисциплины",
  },
  "search.field.summary": {
    en: "Summary", fr: "Résumé", es: "Resumen", ar: "الملخص", zh: "摘要", ru: "Сводка",
  },
  "search.field.description": {
    en: "Description", fr: "Description", es: "Descripción", ar: "الوصف", zh: "描述", ru: "Описание",
  },
  "search.field.dataType": {
    en: "Data type", fr: "Type de données", es: "Tipo de datos", ar: "نوع البيانات", zh: "数据类型", ru: "Тип данных",
  },
  "search.field.dataFormat": {
    en: "Data format", fr: "Format de données", es: "Formato de datos", ar: "صيغة البيانات", zh: "数据格式", ru: "Формат данных",
  },
  "search.field.dataStandard": {
    en: "Data standard", fr: "Norme de données", es: "Estándar de datos", ar: "معيار البيانات", zh: "数据标准", ru: "Стандарт данных",
  },
  "search.field.metric": {
    en: "Metric", fr: "Métrique", es: "Métrica", ar: "المقياس", zh: "指标", ru: "Метрика",
  },
  "search.field.accessType": {
    en: "Access type", fr: "Type d'accès", es: "Tipo de acceso", ar: "نوع الوصول", zh: "访问类型", ru: "Тип доступа",
  },
  "search.field.accessMethod": {
    en: "Access method", fr: "Méthode d'accès", es: "Método de acceso", ar: "طريقة الوصول", zh: "访问方式", ru: "Способ доступа",
  },
  "search.field.accessDetail": {
    en: "Access detail", fr: "Détail d'accès", es: "Detalle de acceso", ar: "تفصيل الوصول", zh: "访问详情", ru: "Сведения о доступе",
  },
  "search.field.source": {
    en: "Source", fr: "Source", es: "Fuente", ar: "المصدر", zh: "来源", ru: "Источник",
  },
  "search.field.gallery": {
    en: "Gallery", fr: "Galerie", es: "Galería", ar: "المعرض", zh: "图库", ru: "Галерея",
  },
  "search.field.agentRoute": {
    en: "Agent route", fr: "Route d'agent", es: "Ruta de agente", ar: "مسار الوكيل", zh: "代理路由", ru: "Маршрут агента",
  },
} satisfies Record<string, Record<SupportedLocale, string>>;
