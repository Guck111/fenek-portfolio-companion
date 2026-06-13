import { POLAR_CHECKOUT_URL } from "@/lib/site"

type CheckoutButtonProps = {
	label: string
	className?: string
}

// Sends the user to the Polar-hosted Pro checkout. External, user-initiated
// click — not an automatic request.
export const CheckoutButton = ({ label, className = "btn btn-pri" }: CheckoutButtonProps) => (
	<a className={className} href={POLAR_CHECKOUT_URL} target="_blank" rel="noopener noreferrer">
		<span>{label}</span>
	</a>
)
