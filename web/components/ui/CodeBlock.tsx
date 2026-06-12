type CodeBlockProps = {
	children: string
}

// Terminal-style block. Lines starting with "#" render as dimmed comments,
// matching the design's .cmd treatment. Content is plain text rendered as React
// children — never raw HTML.
export const CodeBlock = ({ children }: CodeBlockProps) => {
	const lines = children.split("\n")
	return (
		<pre className="cmd">
			{lines.map((line, i) => (
				<span key={i}>
					{line.startsWith("#") ? <span className="pr">{line}</span> : line}
					{i < lines.length - 1 ? "\n" : null}
				</span>
			))}
		</pre>
	)
}
