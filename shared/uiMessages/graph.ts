import type { SupportedLocale } from "../domain";

export const graphMessages = {
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
