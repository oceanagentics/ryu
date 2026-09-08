import { Select } from "antd";

import { supportedLocales } from "../../../../shared/localization";
import { localeNativeNames, t } from "../i18n";
import { useGraphStore } from "../state/graphStore";

const localeOptions = supportedLocales.map((locale) => ({
  label: localeNativeNames[locale],
  value: locale,
}));

export function GraphLanguageSelector() {
  const locale = useGraphStore((state) => state.locale);
  const setLocale = useGraphStore((state) => state.setLocale);

  return (
    <Select
      aria-label={t(locale, "app.language")}
      className="app-locale-select graph-language-select"
      options={localeOptions}
      popupMatchSelectWidth={false}
      size="small"
      value={locale}
      onChange={(value) => setLocale(value)}
    />
  );
}
