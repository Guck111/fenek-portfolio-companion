import { PlayIcon } from "@/components/ui/icons"

type DemoFrameProps = {
	label?: string
	caption?: string
}

// Media placeholder. To ship the real clip, drop a
// <video className="demo-video" controls poster="…" /> (or an <img>) inside
// .demo-media in place of .demo-poster — the 16:10 frame needs no layout change.
export const DemoFrame = ({
	label = "Claude Desktop · Fenek",
	caption = "Live demo coming soon",
}: DemoFrameProps) => (
	<div className="demo-frame">
		<div className="demo-bar" aria-hidden="true">
			<span className="demo-dot" />
			<span className="demo-dot" />
			<span className="demo-dot" />
			<span className="demo-bar-label">{label}</span>
		</div>
		<div className="demo-media">
			<div className="demo-poster">
				<span className="demo-play">
					<PlayIcon />
				</span>
				<span className="demo-cap">{caption}</span>
			</div>
		</div>
	</div>
)
