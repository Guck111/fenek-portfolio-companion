import { ValidationError } from "../../utils/errors.js"

// Minimal, dependency-free XML reader scoped to the IBKR Flex schema. Flex XML is
// machine-generated, regular and attribute-only (data lives in element attributes;
// text nodes appear only in the SendRequest envelope). The scanner is linear (no
// backtracking regex → no ReDoS) and never expands custom entities (immune to
// entity-expansion DoS). Every extracted record is validated by zod downstream.

export interface XmlElement {
  readonly name: string
  readonly attrs: Readonly<Record<string, string>>
  readonly children: readonly XmlElement[]
  readonly text: string
}

interface MutableNode {
  name: string
  attrs: Record<string, string>
  children: MutableNode[]
  text: string
}

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
}

// Decode the five predefined XML entities plus numeric character references
// (&#NN; decimal, &#xHH; hex). Unknown entities are left verbatim rather than
// dropped. Single linear pass — no nested expansion.
export function decodeEntities(value: string): string {
  if (!value.includes("&")) return value
  return value.replace(
    /&(#x[0-9A-Fa-f]+|#[0-9]+|[A-Za-z][A-Za-z0-9]*);/g,
    (whole, body: string) => {
      if (body.startsWith("#x") || body.startsWith("#X")) {
        const code = Number.parseInt(body.slice(2), 16)
        return Number.isNaN(code) ? whole : String.fromCodePoint(code)
      }
      if (body.startsWith("#")) {
        const code = Number.parseInt(body.slice(1), 10)
        return Number.isNaN(code) ? whole : String.fromCodePoint(code)
      }
      return NAMED_ENTITIES[body] ?? whole
    },
  )
}

function isWhitespace(char: string | undefined): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r"
}

// Find the index of the '>' that closes the tag opened at `lt`, respecting
// quoted attribute values (a '>' inside quotes is not the tag end).
function findTagEnd(xml: string, lt: number): number {
  let quote: string | null = null
  for (let i = lt + 1; i < xml.length; i++) {
    const char = xml[i]
    if (quote !== null) {
      if (char === quote) quote = null
    } else if (char === '"' || char === "'") {
      quote = char
    } else if (char === ">") {
      return i
    }
  }
  throw new ValidationError("IBKR Flex XML: unterminated tag")
}

// Parse the raw inner text of a tag (between '<' and '>', '/' already stripped)
// into a name and its attribute map.
function parseTagBody(raw: string): { name: string; attrs: Record<string, string> } {
  const len = raw.length
  let i = 0
  while (i < len && isWhitespace(raw[i])) i++
  const nameStart = i
  while (i < len && !isWhitespace(raw[i]) && raw[i] !== "/") i++
  const name = raw.slice(nameStart, i)
  if (name.length === 0) throw new ValidationError("IBKR Flex XML: empty tag name")

  const attrs: Record<string, string> = {}
  while (i < len) {
    while (i < len && isWhitespace(raw[i])) i++
    if (i >= len || raw[i] === "/") break
    const attrStart = i
    while (i < len && raw[i] !== "=" && !isWhitespace(raw[i])) i++
    const attrName = raw.slice(attrStart, i)
    while (i < len && isWhitespace(raw[i])) i++
    if (raw[i] !== "=") {
      // Boolean attribute with no value — Flex never emits these, but tolerate.
      if (attrName.length > 0) attrs[attrName] = ""
      continue
    }
    i++ // skip '='
    while (i < len && isWhitespace(raw[i])) i++
    const quote = raw[i]
    if (quote !== '"' && quote !== "'") {
      throw new ValidationError(`IBKR Flex XML: unquoted value for attribute '${attrName}'`)
    }
    i++ // skip opening quote
    const valueStart = i
    while (i < len && raw[i] !== quote) i++
    if (i >= len) throw new ValidationError("IBKR Flex XML: unterminated attribute value")
    attrs[attrName] = decodeEntities(raw.slice(valueStart, i))
    i++ // skip closing quote
  }
  return { name, attrs }
}

export function parseXml(xml: string): XmlElement {
  const stack: MutableNode[] = []
  let root: MutableNode | undefined
  let i = 0
  const n = xml.length

  while (i < n) {
    const lt = xml.indexOf("<", i)
    if (lt === -1) break
    const top = stack[stack.length - 1]
    if (lt > i && top !== undefined) {
      top.text += decodeEntities(xml.slice(i, lt))
    }

    if (xml.startsWith("<?", lt)) {
      const end = xml.indexOf("?>", lt)
      if (end === -1)
        throw new ValidationError("IBKR Flex XML: unterminated processing instruction")
      i = end + 2
      continue
    }
    if (xml.startsWith("<!--", lt)) {
      const end = xml.indexOf("-->", lt)
      if (end === -1) throw new ValidationError("IBKR Flex XML: unterminated comment")
      i = end + 3
      continue
    }
    if (xml.startsWith("<!", lt)) {
      const end = xml.indexOf(">", lt)
      if (end === -1) throw new ValidationError("IBKR Flex XML: unterminated declaration")
      i = end + 1
      continue
    }

    const tagEnd = findTagEnd(xml, lt)

    if (xml.startsWith("</", lt)) {
      const name = xml.slice(lt + 2, tagEnd).trim()
      const open = stack.pop()
      if (open?.name !== name) {
        throw new ValidationError(`IBKR Flex XML: mismatched closing tag </${name}>`)
      }
      if (stack.length === 0) root = open
      i = tagEnd + 1
      continue
    }

    let raw = xml.slice(lt + 1, tagEnd)
    const selfClosing = raw.endsWith("/")
    if (selfClosing) raw = raw.slice(0, -1)
    const { name, attrs } = parseTagBody(raw)
    const node: MutableNode = { name, attrs, children: [], text: "" }

    if (selfClosing) {
      if (stack.length === 0) {
        if (root !== undefined) throw new ValidationError("IBKR Flex XML: multiple root elements")
        root = node
      } else {
        const parent = stack[stack.length - 1]
        if (parent !== undefined) parent.children.push(node)
      }
    } else {
      if (stack.length === 0 && root !== undefined) {
        throw new ValidationError("IBKR Flex XML: multiple root elements")
      }
      const parent = stack[stack.length - 1]
      if (parent !== undefined) parent.children.push(node)
      stack.push(node)
    }
    i = tagEnd + 1
  }

  if (stack.length > 0) throw new ValidationError("IBKR Flex XML: unclosed element")
  if (root === undefined) throw new ValidationError("IBKR Flex XML: no root element")
  return root
}

export function childrenNamed(element: XmlElement, name: string): readonly XmlElement[] {
  return element.children.filter((child) => child.name === name)
}

// Depth-first search for the first descendant (including direct children) by name.
export function firstNamed(element: XmlElement, name: string): XmlElement | undefined {
  for (const child of element.children) {
    if (child.name === name) return child
    const nested = firstNamed(child, name)
    if (nested !== undefined) return nested
  }
  return undefined
}

export interface SendRequestEnvelope {
  status: string
  referenceCode?: string
  url?: string
  errorCode?: string
  errorMessage?: string
}

function childTextCI(root: XmlElement, lowerName: string): string | undefined {
  const match = root.children.find((child) => child.name.toLowerCase() === lowerName)
  return match?.text.trim()
}

// Parse the SendRequest (and in-progress/error) envelope. Element names are matched
// case-insensitively — the <Url> casing differs across IBKR sources.
export function parseSendRequestEnvelope(xml: string): SendRequestEnvelope {
  const root = parseXml(xml)
  const result: SendRequestEnvelope = { status: childTextCI(root, "status") ?? "" }
  const referenceCode = childTextCI(root, "referencecode")
  const url = childTextCI(root, "url")
  const errorCode = childTextCI(root, "errorcode")
  const errorMessage = childTextCI(root, "errormessage")
  if (referenceCode !== undefined) result.referenceCode = referenceCode
  if (url !== undefined) result.url = url
  if (errorCode !== undefined) result.errorCode = errorCode
  if (errorMessage !== undefined) result.errorMessage = errorMessage
  return result
}

export function statementRootName(xml: string): string {
  return parseXml(xml).name
}

// Extract the FlexStatement nodes of a completed FlexQueryResponse. Validates the
// FlexStatements count attribute against the actual child count (ibflex parity) so
// a truncated response surfaces as a ValidationError rather than silent data loss.
export function extractStatements(xml: string): readonly XmlElement[] {
  const root = parseXml(xml)
  const container = root.children.find((child) => child.name === "FlexStatements")
  if (container === undefined) {
    throw new ValidationError("IBKR Flex XML: missing FlexStatements container")
  }
  const statements = childrenNamed(container, "FlexStatement")
  const declared = container.attrs["count"]
  if (declared !== undefined) {
    const expected = Number.parseInt(declared, 10)
    if (!Number.isNaN(expected) && expected !== statements.length) {
      throw new ValidationError(
        `IBKR Flex XML: FlexStatements count ${declared} does not match ${String(statements.length)} statements`,
      )
    }
  }
  return statements
}
