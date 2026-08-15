/**
 * The workbench chrome: toolbar of numbered tool windows, Projects rail,
 * tabbed editor area with breadcrumb, Find along the bottom, Chat right,
 * status bar underneath. Tool windows are layout — routes render into the
 * editor area through the Outlet.
 *
 * Panel open/closed state and rail widths live in root search params
 * (root-search.ts), so the address bar names the whole workbench.
 */
import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import tokensCss from "../ui/react/tokens.css?url";
import chromeCss from "../ui/react/workbench/chrome.css?url";
import { ChatRail } from "../ui/react/chat/ChatRail.js";
import { DocWindow } from "../ui/react/docwin/DocWindow.js";
import { FindStrip } from "../ui/react/find/FindStrip.js";
import { PaletteAndHelp } from "../ui/react/palette/Palette.js";
import { ProjectsRail } from "../ui/react/projects/ProjectsRail.js";
import { Grip } from "../ui/react/workbench/Grips.js";
import { StatusBar } from "../ui/react/workbench/StatusBar.js";
import { Toolbar } from "../ui/react/workbench/Toolbar.js";
import { WorkbenchKeys } from "../ui/react/workbench/WorkbenchKeys.js";
import { ROOT_DEFAULTS, validateRootSearch } from "../ui/react/workbench/root-search.js";
import { getWorkbenchMeta, type WorkbenchMeta } from "../features/projects/projects.functions.js";

export const Route = createRootRoute({
	validateSearch: validateRootSearch,
	loader: async (): Promise<WorkbenchMeta> => getWorkbenchMeta() as Promise<WorkbenchMeta>,
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "flusk" },
		],
		links: [
			{ rel: "stylesheet", href: tokensCss },
			{ rel: "stylesheet", href: chromeCss },
		],
	}),
	component: RootComponent,
	shellComponent: RootDocument,
});

function RootComponent() {
	const meta = Route.useLoaderData() as WorkbenchMeta;
	const search = Route.useSearch();
	const side = search.side ?? ROOT_DEFAULTS.side;
	const chat = search.chat ?? ROOT_DEFAULTS.chat;
	const find = search.find ?? ROOT_DEFAULTS.find;
	const doc = search.doc ?? ROOT_DEFAULTS.doc;
	return (
		<div
			id="app"
			data-side={side ? "on" : "off"}
			data-chat={chat ? "on" : "off"}
			style={{
				...(search.sw !== undefined ? { ["--tw-left" as string]: `${search.sw}px` } : {}),
				...(search.cw !== undefined ? { ["--tw-right" as string]: `${search.cw}px` } : {}),
			}}
		>
			<Toolbar />
			{side ? (
				<>
					<ProjectsRail />
					<Grip side="left" />
				</>
			) : null}
			<main id="main">
				<Outlet />
			</main>
			{chat ? (
				<>
					<Grip side="right" />
					<ChatRail />
				</>
			) : null}
			{doc ? <DocWindow /> : null}
			{find ? <FindStrip /> : null}
			<StatusBar home={meta.home} version={meta.version} projects={meta.projects} live={meta.live} />
			<PaletteAndHelp />
			<WorkbenchKeys />
		</div>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Scripts />
			</body>
		</html>
	);
}
