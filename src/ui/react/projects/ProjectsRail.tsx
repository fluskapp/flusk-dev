/** Tool window 1: the Projects rail. The tree itself lands with the port. */
export function ProjectsRail() {
	return (
		<aside id="side">
			<div className="tw-head">
				<span className="tw-num">1</span>
				<span>Projects</span>
			</div>
			<input id="search" placeholder="Search (/)  project, path, kind" spellCheck={false} />
			<div id="tree" />
		</aside>
	);
}
