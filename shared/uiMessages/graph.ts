import type { SupportedLocale } from "../domain";

export const graphMessages = {
  "graph.detailLevel": {
    en: "Relationship detail", fr: "Détail des relations", es: "Detalle de relaciones", ar: "تفاصيل العلاقات", zh: "关系详细程度", ru: "Детализация связей",
  },
  "graph.level.family": {
    en: "Family", fr: "Famille", es: "Familia", ar: "فئة", zh: "关系族", ru: "Семейство",
  },
  "graph.level.type": {
    en: "Type", fr: "Type", es: "Tipo", ar: "نوع", zh: "类型", ru: "Тип",
  },
  "graph.level.entity": {
    en: "Entity", fr: "Entité", es: "Entidad", ar: "كيان", zh: "实体", ru: "Объект",
  },
  "graph.family.org": {
    en: "Org", fr: "Organisation", es: "Organización", ar: "تنظيم", zh: "组织", ru: "Организация",
  },
  "graph.family.data": {
    en: "Data", fr: "Données", es: "Datos", ar: "بيانات", zh: "数据", ru: "Данные",
  },
  "graph.binLabel": {
    en: "{count} {group} nodes", fr: "{count} {group} nœuds", es: "{count} {group} nodos",
    ar: "{count} {group} عقد", zh: "{count} {group}节点", ru: "{count} {group} узлов",
  },
  "graph.binSummary": {
    en: "{total} entities · {visible} visible · {hidden} hidden · {edges} relationships",
    fr: "{total} entités · {visible} visibles · {hidden} masquées · {edges} relations",
    es: "{total} entidades · {visible} visibles · {hidden} ocultas · {edges} relaciones",
    ar: "{total} كيان · {visible} ظاهر · {hidden} مخفي · {edges} علاقة",
    zh: "{total} 个实体 · {visible} 个可见 · {hidden} 个隐藏 · {edges} 条关系",
    ru: "Объекты: {total} · Видимые: {visible} · Скрытые: {hidden} · Связи: {edges}",
  },
  "graph.binHelp": {
    en: "Counts are unique hidden entities per group and may overlap. Shared and selected entities stay visible. Click a group to expand it.",
    fr: "Les nombres indiquent les entités masquées uniques par groupe et peuvent se recouper. Les entités partagées et sélectionnées restent visibles. Cliquez sur un groupe pour le développer.",
    es: "Los recuentos son entidades ocultas únicas por grupo y pueden solaparse. Las entidades compartidas y seleccionadas siguen visibles. Haz clic en un grupo para expandirlo.",
    ar: "الأعداد تمثل كيانات مخفية فريدة لكل مجموعة وقد تتداخل. تبقى الكيانات المشتركة والمحددة ظاهرة. انقر على مجموعة لتوسيعها.",
    zh: "计数表示每组唯一的隐藏实体，各组可能重叠。共享和选中的实体保持可见。点击组即可展开。",
    ru: "Счётчики показывают уникальные скрытые объекты в каждой группе; группы могут пересекаться. Общие и выбранные объекты остаются видимыми. Нажмите на группу, чтобы раскрыть её.",
  },
  "graph.collapseRelationships": {
    en: "Collapse expanded groups", fr: "Replier les groupes développés", es: "Contraer grupos expandidos", ar: "طي المجموعات الموسعة", zh: "收起已展开的组", ru: "Свернуть раскрытые группы",
  },
  "graph.entityOnly": {
    en: "Tree and Globe currently show entities only. Your Graph detail preference is preserved.",
    fr: "Les vues Arbre et Globe affichent uniquement les entités. Votre préférence de détail du graphe est conservée.",
    es: "Árbol y Globo solo muestran entidades por ahora. Se conserva tu preferencia de detalle del grafo.",
    ar: "تعرض الشجرة والكرة الأرضية الكيانات فقط حاليًا. يُحفظ تفضيل تفاصيل الرسم البياني.",
    zh: "树和地球视图目前仅显示实体。图谱详细程度偏好将被保留。",
    ru: "Дерево и Глобус пока показывают только объекты. Настройка детализации графа сохраняется.",
  },
  "graph.legend": {
    en: "Legend", fr: "Légende", es: "Leyenda", ar: "وسيلة الإيضاح", zh: "图例", ru: "Легенда",
  },
  "graph.minimizeLegend": {
    en: "Minimize legend", fr: "Réduire la légende", es: "Minimizar leyenda", ar: "تصغير وسيلة الإيضاح", zh: "最小化图例", ru: "Свернуть легенду",
  },
  "graph.expandLegend": {
    en: "Expand legend", fr: "Développer la légende", es: "Expandir leyenda", ar: "توسيع وسيلة الإيضاح", zh: "展开图例", ru: "Развернуть легенду",
  },
  "graph.hideKind": {
    en: "Hide {kind}", fr: "Masquer {kind}", es: "Ocultar {kind}", ar: "إخفاء {kind}", zh: "隐藏{kind}", ru: "Скрыть {kind}",
  },
  "graph.showKind": {
    en: "Show {kind}", fr: "Afficher {kind}", es: "Mostrar {kind}", ar: "إظهار {kind}", zh: "显示{kind}", ru: "Показать {kind}",
  },
  "graph.nodes": {
    en: "Nodes", fr: "Noeuds", es: "Nodos", ar: "العقد", zh: "节点", ru: "Узлы",
  },
  "graph.edges": {
    en: "Edges", fr: "Arêtes", es: "Aristas", ar: "الحواف", zh: "边", ru: "Рёбра",
  },
  "graph.nodeLabels": {
    en: "Node labels", fr: "Étiquettes des nœuds", es: "Etiquetas de nodos", ar: "تسميات العقد", zh: "节点标签", ru: "Подписи узлов",
  },
  "graph.binLabels": {
    en: "Bins", fr: "Regroupements", es: "Agrupaciones", ar: "المجموعات", zh: "分组", ru: "Группы",
  },
  "graph.plannedRelationships": {
    en: "planned relationships", fr: "relations prévues", es: "relaciones previstas", ar: "علاقات مخططة", zh: "计划关系",
    ru: "планируемые связи",
  },
  "graph.legendNote": {
    en: "Click a node or edge type to show or hide it.", fr: "Cliquez sur un type de nœud ou d’arête pour l’afficher ou le masquer.",
    es: "Haz clic en un tipo de nodo o arista para mostrarlo u ocultarlo.", ar: "انقر على نوع عقدة أو حافة لإظهاره أو إخفائه.",
    zh: "点击节点或边的类型即可显示或隐藏。", ru: "Щёлкните тип узла или ребра, чтобы показать или скрыть его.",
  },
  "graph.arrangement.current": {
    en: "Graph", fr: "Graphe", es: "Grafo", ar: "رسم بياني", zh: "图谱", ru: "Граф",
  },
  "graph.arrangement.flat": {
    en: "Tree", fr: "Arbre", es: "Árbol", ar: "شجرة", zh: "树", ru: "Дерево",
  },
  "graph.arrangement.globe": {
    en: "Globe", fr: "Globe", es: "Globo", ar: "كرة أرضية", zh: "地球", ru: "Глобус",
  },
} satisfies Record<string, Record<SupportedLocale, string>>;
