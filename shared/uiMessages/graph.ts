import type { SupportedLocale } from "../domain";

export const graphMessages = {
  "graph.legend": {
    en: "Legend", fr: "Légende", es: "Leyenda", ar: "وسيلة الإيضاح", zh: "图例", ru: "Легенда",
  },
  "graph.hideNodeKind": {
    en: "Hide {kind}", fr: "Masquer {kind}", es: "Ocultar {kind}", ar: "إخفاء {kind}", zh: "隐藏{kind}", ru: "Скрыть {kind}",
  },
  "graph.showNodeKind": {
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
    en: "Click a node type to show or hide it.", fr: "Cliquez sur un type de noeud pour l'afficher ou le masquer.",
    es: "Haz clic en un tipo de nodo para mostrarlo u ocultarlo.", ar: "انقر على نوع عقدة لإظهاره أو إخفائه.",
    zh: "点击节点类型即可显示或隐藏。", ru: "Щёлкните тип узла, чтобы показать или скрыть его.",
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
