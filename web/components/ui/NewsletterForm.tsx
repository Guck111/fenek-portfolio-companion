import { BUTTONDOWN_USERNAME } from "@/lib/config"

type NewsletterFormProps = {
	tag?: string
	buttonLabel?: string
	placeholder?: string
}

// Plain HTML POST to Buttondown — no JavaScript, no third-party script. This is
// the only external endpoint the built site ever talks to.
export const NewsletterForm = ({
	tag,
	buttonLabel = "Get release notes",
	placeholder = "you@example.com",
}: NewsletterFormProps) => (
	<form
		className="newsletter"
		action={`https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
		method="post"
		target="_blank"
	>
		<input
			className="newsletter-input"
			type="email"
			name="email"
			required
			placeholder={placeholder}
			aria-label="Email address"
			autoComplete="email"
		/>
		{tag ? <input type="hidden" name="tag" value={tag} /> : null}
		<button className="btn btn-pri" type="submit">
			{buttonLabel}
		</button>
	</form>
)
