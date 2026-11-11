import React, { Suspense } from "react";
import { RouteObject } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { AuthLayout } from "../layouts/AuthLayout";
import { EmptyLayout } from "../layouts/EmptyLayout";
import { AuthGuard } from "./AuthGuard";

export type PageComponent = React.ComponentType<any> & {
  layout?: React.ComponentType<{ children?: React.ReactNode }>;
  auth?: boolean;
  roles?: Array<"admin" | "speaker" | "member">;
};

export interface PageModule {
  default?: PageComponent;
  layout?: React.ComponentType<{ children?: React.ReactNode }>;
  auth?: boolean;
  roles?: Array<"admin" | "speaker" | "member">;
  [key: string]: any;
}

/**
 * Transforms a Next.js-style file path relative to `src/pages` into a React Router URL path pattern.
 *
 * Examples:
 *   ../pages/index.tsx -> /
 *   ../pages/login.tsx -> /login
 *   ../pages/parliament/index.tsx -> /parliament
 *   ../pages/parliament/[id].tsx -> /parliament/:id
 *   ../pages/parliament/[pId]/member/[mId].tsx -> /parliament/:pId/member/:mId
 *   ../pages/[...slug].tsx -> /*
 *   ../pages/404.tsx -> *
 */
export function filePathToRoutePath(filePath: string): string {
  // Normalize path separators and remove ../pages/ or /src/pages/ prefix
  let cleanPath = filePath
    .replace(/\\/g, "/")
    .replace(/^.*?\/pages\//, "")
    .replace(/\.(tsx|jsx|js|ts)$/, "");

  // Special cases for 404 / catch-all
  if (cleanPath === "404" || cleanPath === "_404") {
    return "*";
  }

  // Handle [...slug] catch-all
  cleanPath = cleanPath.replace(/\[\.\.\.(.*?)\]/g, "*");

  // Handle [param] dynamic parameter
  cleanPath = cleanPath.replace(/\[(.*?)\]/g, ":$1");

  // Handle index files
  if (cleanPath === "index") {
    return "/";
  }
  if (cleanPath.endsWith("/index")) {
    cleanPath = cleanPath.slice(0, -"/index".length);
  }

  return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
}

/**
 * Next.js Pages Router priority sorting algorithm:
 * 1. Static routes rank highest (/parliament/members)
 * 2. Dynamic routes rank next (/parliament/:id)
 * 3. Catch-all routes rank next (/parliament/*)
 * 4. 404 / wildcard (*) rank last
 */
export function calculateRoutePriority(path: string): number {
  if (path === "*") return -9999;

  const segments = path.split("/").filter(Boolean);
  let score = segments.length * 10;

  for (const seg of segments) {
    if (seg === "*") {
      score += 1;
    } else if (seg.startsWith(":")) {
      score += 10;
    } else {
      score += 100; // static segment receives high priority
    }
  }

  return score;
}

/**
 * Discovers and builds React Router route configurations from `src/pages`.
 */
export function generateRoutes(): RouteObject[] {
  // Discover all page files using Vite's compile-time glob import
  const modules = import.meta.glob<PageModule>("../pages/**/*.{tsx,jsx}", { eager: true });

  const routeEntries: Array<{
    path: string;
    score: number;
    filePath: string;
    module: PageModule;
  }> = [];

  for (const [filePath, mod] of Object.entries(modules)) {
    // Skip internal helper files starting with _ (like _app or _document)
    const fileName = filePath.split("/").pop() || "";
    if (fileName.startsWith("_") && fileName !== "_404.tsx") {
      continue;
    }

    const path = filePathToRoutePath(filePath);
    const score = calculateRoutePriority(path);

    routeEntries.push({
      path,
      score,
      filePath,
      module: mod
    });
  }

  // Sort by priority score in descending order (highest priority first)
  routeEntries.sort((a, b) => b.score - a.score);

  return routeEntries.map(({ path, module: mod }) => {
    const Component: React.ComponentType<any> = mod.default || (() => <div>Page Component Missing</div>);
    const pageMeta = (mod.default || {}) as Partial<PageComponent>;

    // Resolve layout: Component.layout > module.layout > default by route convention
    let Layout: React.ComponentType<{ children?: React.ReactNode }> | undefined =
      pageMeta.layout || mod.layout;
    if (!Layout) {
      if (path === "/login") {
        Layout = AuthLayout;
      } else if (path === "*") {
        Layout = EmptyLayout;
      } else {
        Layout = MainLayout;
      }
    }

    // Resolve auth requirement: Component.auth > module.auth > default by route convention
    let requireAuth = pageMeta.auth ?? mod.auth;
    if (requireAuth === undefined) {
      // /login and 404 (*) are public by default; others are protected by default
      requireAuth = path !== "/login" && path !== "*";
    }

    // Resolve role restrictions: Component.roles > module.roles
    let requiredRoles = pageMeta.roles || mod.roles;
    if (!requiredRoles && path === "/register") {
      requiredRoles = ["admin"];
    }

    return {
      path,
      element: (
        <AuthGuard requireAuth={requireAuth} requiredRoles={requiredRoles}>
          <Layout>
            <Suspense
              fallback={
                <div className="flex-1 flex items-center justify-center p-8 text-amber-400 font-mono text-sm animate-pulse">
                  Loading chamber workspace...
                </div>
              }
            >
              <Component />
            </Suspense>
          </Layout>
        </AuthGuard>
      )
    };
  });
}

export default generateRoutes;

