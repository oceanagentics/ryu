export const isStaticApp = import.meta.env.MODE === "static" || import.meta.env.VITE_STATIC_PREVIEW === "true";
export const appMode = isStaticApp || import.meta.env.VITE_APP_MODE === "public" || (
  import.meta.env.DEV && typeof window !== "undefined" && !/\/admin(?:\/|$)/.test(window.location.pathname)
) ? "public" : "author";
export const isPublicApp = appMode === "public";
export const canReviewNodes = import.meta.env.VITE_CAN_REVIEW_NODES === "false"
  ? false
  : !isPublicApp;

function normalizeBasePath(value: string | undefined): string {
  if (!value || value === "/") {
    return "";
  }

  return `/${value.replace(/^\/+|\/+$/g, "")}`;
}

export const appBasePath = normalizeBasePath(import.meta.env.BASE_URL);
export const adminAppBasePath = normalizeBasePath(
  import.meta.env.VITE_ADMIN_BASE_PATH ?? "/explorer/admin",
);

export function appPath(path: string): string {
  return `${appBasePath}/${path.replace(/^\/+/, "")}`;
}

export const bootstrapPath = import.meta.env.VITE_BOOTSTRAP_PATH || appPath(isStaticApp ? "/bootstrap.public.json" : "/api/graph/bootstrap");
