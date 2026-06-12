import { DownloadIcon } from "@/components/ui/icons"
import { RELEASES_LATEST_URL } from "@/lib/site"

type DownloadButtonProps = {
	label?: string
	className?: string
}

// Always points at the GitHub "Latest" release (v0.4.1+ since the re-pin).
export const DownloadButton = ({
	label = "Download for Claude Desktop",
	className = "btn btn-pri",
}: DownloadButtonProps) => (
	<a className={className} href={RELEASES_LATEST_URL} target="_blank" rel="noopener noreferrer">
		<DownloadIcon />
		<span>{label}</span>
	</a>
)
