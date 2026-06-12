import { PlayIcon } from "@/components/ui/icons"

// Hero media placeholder. To ship the real demo, drop a
// <video className="demo-video" controls poster="…" /> (or an <img>) inside
// .demo-media in place of .demo-poster — the 16:10 frame needs no layout change.
export const DemoFrame = () => (
	<div className="demo-frame">
		<div className="demo-bar" aria-hidden="true">
			<span className="demo-dot" />
			<span className="demo-dot" />
			<span className="demo-dot" />
			<span className="demo-bar-label">Claude Desktop · Fenek</span>
		</div>
		<div className="demo-media">
			<div className="demo-poster">
				<span className="demo-play">
					<PlayIcon />
				</span>
				<span className="demo-cap">Live demo coming soon</span>
			</div>
		</div>
	</div>
)
