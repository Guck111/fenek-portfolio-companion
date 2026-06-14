import { BUTTONDOWN_USERNAME } from "@/lib/config"

type NewsletterFormProps = {
	tag?: string
	buttonLabel?: string
	placeholder?: string
	ariaLabel?: string
	className?: string
	// Optional free-text field posted as Buttondown subscriber metadata
	// (name must be `metadata__<key>`). Used by the "vote for the next source" form.
	extraField?: { name: string; label: string; placeholder: string }
}

// Plain HTML POST to Buttondown — no JavaScript, no third-party script. This is
// the only external endpoint the built site ever talks to.
export const NewsletterForm = ({
	tag,
	buttonLabel = "Get release notes",
	placeholder = "you@example.com",
	ariaLabel = "Email address",
	className = "",
	extraField,
}: NewsletterFormProps) => (
	<form
		className={`newsletter ${className}`.trim()}
		action={`https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
		method="post"
		target="_blank"
	>
		{extraField ? (
			<input
				className="newsletter-input newsletter-extra"
				type="text"
				name={extraField.name}
				placeholder={extraField.placeholder}
				aria-label={extraField.label}
				maxLength={120}
			/>
		) : null}
		<input
			className="newsletter-input"
			type="email"
			name="email"
			required
			placeholder={placeholder}
			aria-label={ariaLabel}
			autoComplete="email"
		/>
		{tag ? <input type="hidden" name="tag" value={tag} /> : null}
		<button className="btn btn-pri" type="submit">
			{buttonLabel}
		</button>
	</form>
)
