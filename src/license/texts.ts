const SITE = "https://fenek.tech"

export const PRO_TOOL_DESCRIPTION_SUFFIX = ` (Fenek Pro, crypto sources — license required: ${SITE})`

export const AGGREGATE_EXCLUDED_NOTE = `Crypto sources excluded — they are part of Fenek Pro (${SITE}). Totals cover free sources only.`

export const PRO_INSTRUCTIONS_SENTENCE = `If a tool returns a Fenek Pro licensing error, relay it to the user in one short sentence (mention ${SITE}) and do not retry the call in the same turn.`

export type ProDenialReason = "no-key" | "revoked" | "unreachable"

const DENIAL_TEXTS: Readonly<Record<ProDenialReason, string>> = {
  "no-key": `This tool is part of Fenek Pro (crypto sources). No license key is configured. Get a key at ${SITE}, or build the free 'freepro' flavor from source — it is official and documented in docs/building-pro.md. All classic-broker and portfolio tools keep working without a license.`,
  revoked: `The Fenek Pro subscription for the configured license key has ended (the license server confirmed the key is no longer active). Renew at ${SITE}. Crypto tools are paused until then; classic-broker and portfolio tools keep working.`,
  unreachable: `Fenek could not validate the Pro license: the license server has been unreachable (either since the key was entered, or for longer than the 14-day grace window). This is not a billing decision — access resumes automatically once validation succeeds. Classic-broker and portfolio tools keep working.`,
}

export function proDenialText(reason: ProDenialReason): string {
  return DENIAL_TEXTS[reason]
}
