import {
	AuthorIcon,
	BankIcon,
	CheckIcon,
	LockIcon,
	MacIcon,
	XMarkIcon,
} from "@/components/ui/icons"

const FOOT = ["Read-only requests", "Keys stay in your OS keychain", "Zero telemetry"]

// The "what leaves your computer" diagram: your machine talks to your broker
// over HTTPS; the developer sits outside the channel, cut off from the flow.
export const DataFlow = () => (
	<div className="flow">
		<div className="kicker">What leaves your computer</div>
		<div className="flow-head">Fenek talks to your brokers — and to no one else.</div>
		<div className="channel">
			<div className="pnode major">
				<div className="pnode-ic">
					<MacIcon />
				</div>
				<div>
					<div className="pnode-nm">Your machine</div>
					<div className="pnode-sub">Claude Desktop + Fenek</div>
				</div>
			</div>
			<div className="link">
				<div className="link-rail" />
				<div className="link-lock">
					<LockIcon />
					<span>HTTPS</span>
				</div>
			</div>
			<div className="pnode major">
				<div className="pnode-ic">
					<BankIcon />
				</div>
				<div>
					<div className="pnode-nm">Your broker</div>
					<div className="pnode-sub">Official read-only API</div>
				</div>
			</div>
		</div>
		<div className="flow-outside">
			<div className="cut">
				<span className="cut-x">
					<XMarkIcon />
				</span>
			</div>
			<div className="pnode ghost">
				<div className="pnode-ic">
					<AuthorIcon />
				</div>
				<div>
					<div className="pnode-nm">The developer</div>
					<div className="pnode-sub">No server. No analytics.</div>
				</div>
			</div>
			<div className="cut-cap">
				Fenek has no backend. Nothing routes through the author, so there is nowhere else for your
				data to go.
			</div>
		</div>
		<div className="flow-foot">
			{FOOT.map((item) => (
				<div className="ff" key={item}>
					<span className="ff-ic">
						<CheckIcon />
					</span>
					<span>{item}</span>
				</div>
			))}
		</div>
	</div>
)
