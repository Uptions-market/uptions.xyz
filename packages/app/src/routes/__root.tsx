import { TanStackDevtools } from "@tanstack/react-devtools";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import { LoaderScreen } from "@/components/skeleton/loader-screen";
import { ThemeProvider } from "@/components/theme/theme-provider.tsx";
import { QueryProvider } from "@/providers/query-provider.tsx";
import { WalletProvider } from "@/providers/wallet-provider.tsx";

import appCss from "../styles.css?url";

const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL ?? "https://uptions.app";
const siteTitle = "Uptions";
const siteDescription =
	"Automate prediction market strategies with wallet identity, connected markets, and workflow automation.";
const ogImageUrl = new URL("/og-image.svg", siteUrl).toString();

const themeScript = `
(function () {
  try {
    var storageKey = "uptions-theme";
    var storedTheme = window.localStorage.getItem(storageKey);
    var theme = storedTheme === "light" || storedTheme === "dark"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.dataset.theme = theme;
  } catch (_) {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "dark";
  }
})();
`;

export const Route = createRootRoute({
	pendingComponent: LoaderScreen,
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				name: "description",
				content: siteDescription,
			},
			{
				title: "Uptions",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:site_name",
				content: siteTitle,
			},
			{
				property: "og:title",
				content: siteTitle,
			},
			{
				property: "og:description",
				content: siteDescription,
			},
			{
				property: "og:url",
				content: siteUrl,
			},
			{
				property: "og:image",
				content: ogImageUrl,
			},
			{
				property: "og:image:width",
				content: "1200",
			},
			{
				property: "og:image:height",
				content: "630",
			},
			{
				property: "og:image:alt",
				content: "Uptions prediction market automation dashboard",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				name: "twitter:title",
				content: siteTitle,
			},
			{
				name: "twitter:description",
				content: siteDescription,
			},
			{
				name: "twitter:image",
				content: ogImageUrl,
			},
			{
				name: "theme-color",
				content: "#FF4F00",
			},
		],
		links: [
			{
				rel: "icon",
				type: "image/svg+xml",
				href: "/app-icon.svg",
			},
			{
				rel: "apple-touch-icon",
				href: "/app-icon.svg",
			},
			{
				rel: "manifest",
				href: "/manifest.json",
			},
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					// biome-ignore lint/security/noDangerouslySetInnerHtml: Runs before first paint to prevent theme flash.
					dangerouslySetInnerHTML={{ __html: themeScript }}
				/>
				<HeadContent />
			</head>
			<body suppressHydrationWarning>
				<QueryProvider>
					<WalletProvider>
						<ThemeProvider>{children}</ThemeProvider>
						<Toaster closeButton position="top-right" richColors />
					</WalletProvider>
				</QueryProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
