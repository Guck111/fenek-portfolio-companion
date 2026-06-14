import { DownloadIcon } from "@/components/ui/icons"
import { MCPB_DOWNLOAD_URL } from "@/lib/site"

type DownloadButtonProps = {
	label?: string
	className?: string
}

// Direct-downloads the .mcpb attached to the GitHub "Latest" release (v0.4.1+
// since the re-pin) — no intermediate release page. The endpoint serves the
// asset with Content-Disposition: attachment, so the click downloads in place.
export const DownloadButton = ({
	label = "Download for Claude Desktop",
	className = "btn btn-pri",
}: DownloadButtonProps) => (
	<a className={className} href={MCPB_DOWNLOAD_URL} download rel="noopener noreferrer">
		<DownloadIcon />
		<span>{label}</span>
	</a>
)
