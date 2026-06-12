import {
	AuthorIcon,
	BankIcon,
	CheckIcon,
	LockIcon,
	MacIcon,
	XMarkIcon,
} from "@/components/ui/icons"
import type { Dictionary } from "@/lib/dictionaries"

type DataFlowProps = {
	flow: Dictionary["security"]["flow"]
}

// The "what leaves your computer" diagram: your machine talks to your broker
// over HTTPS; the developer sits outside the channel, cut off from the flow.
export const DataFlow = ({ flow }: DataFlowProps) => (
	<div className="flow">
		<div className="kicker">{flow.kicker}</div>
		<div className="flow-head">{flow.head}</div>
		<div className="channel">
			<div className="pnode major">
				<div className="pnode-ic">
					<MacIcon />
				</div>
				<div>
					<div className="pnode-nm">{flow.machineName}</div>
					<div className="pnode-sub">{flow.machineSub}</div>
				</div>
			</div>
			<div className="link">
				<div className="link-rail" />
				<div className="link-lock">
					<LockIcon />
					<span>{flow.lock}</span>
				</div>
			</div>
			<div className="pnode major">
				<div className="pnode-ic">
					<BankIcon />
				</div>
				<div>
					<div className="pnode-nm">{flow.brokerName}</div>
					<div className="pnode-sub">{flow.brokerSub}</div>
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
					<div className="pnode-nm">{flow.authorName}</div>
					<div className="pnode-sub">{flow.authorSub}</div>
				</div>
			</div>
			<div className="cut-cap">{flow.sever}</div>
		</div>
		<div className="flow-foot">
			{flow.foot.map((item) => (
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
