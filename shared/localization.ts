import type {
  GraphNode,
  LocalizationDetailsByKind,
  NodeLocalizationDetails,
  ResolvedNodeLocalization,
  SupportedLocale,
} from "./domain";

export const supportedLocales = ["ar", "zh", "en", "fr", "ru", "es"] as const;
export const defaultLocale = "en" satisfies SupportedLocale;

const supportedLocaleSet = new Set<string>(supportedLocales);

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return typeof value === "string" && supportedLocaleSet.has(value);
}

export function normalizeLocale(value: unknown): SupportedLocale {
  return isSupportedLocale(value) ? value : defaultLocale;
}

export function emptyLocalizationDetails(): Pick<NodeLocalizationDetails, "aliases"> {
  return {
    aliases: [],
  };
}

export function resolveNodeLocalization<N extends GraphNode>(
  node: N,
  requestedLocale: SupportedLocale = defaultLocale,
): ResolvedNodeLocalization<N["kind"]> {
  const displayLocale =
    node.localizations[requestedLocale]?.locale ??
    node.localizations[defaultLocale]?.locale ??
    node.availableLocales
      .map((locale) => node.localizations[locale]?.locale)
      .find((locale): locale is SupportedLocale => Boolean(locale)) ??
    null;
  const localization = displayLocale ? node.localizations[displayLocale] : null;

  return {
    kind: node.kind,
    requestedLocale,
    displayLocale,
    isLocaleFallback: displayLocale !== requestedLocale,
    hasLocalization: Boolean(localization),
    title: localization?.title ?? node.id,
    summary: localization?.summary ?? null,
    ...(node.kind === "country" ? {} : { description: localization && "description" in localization ? localization.description : null }),
    details: (localization?.details ?? emptyLocalizationDetails()) as LocalizationDetailsByKind[N["kind"]],
    translatedFromLocale: localization?.translatedFromLocale ?? null,
    contentUpdatedAt: localization?.contentUpdatedAt ?? null,
    review: localization?.review ?? null,
    createdAt: localization?.createdAt ?? null,
    updatedAt: localization?.updatedAt ?? null,
  } as ResolvedNodeLocalization<N["kind"]>;
}

export function nodeDisplayTitle(
  node: GraphNode,
  requestedLocale: SupportedLocale = defaultLocale,
): string {
  return resolveNodeLocalization(node, requestedLocale).title;
}
