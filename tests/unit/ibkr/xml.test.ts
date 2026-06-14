import { describe, it, expect } from "vitest"

import {
  childrenNamed,
  extractStatements,
  firstNamed,
  parseSendRequestEnvelope,
  parseXml,
  statementRootName,
  type XmlElement,
} from "../../../src/brokers/ibkr/xml.js"
import { ValidationError } from "../../../src/utils/errors.js"

// Narrowing helper — the project forbids non-null assertions (eslint strict),
// so tests assert "defined" through a guard rather than `!`.
function def<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`expected ${what} to be defined`)
  return value
}

describe("parseXml — core scanner", () => {
  it("reads attributes in double and single quotes", () => {
    const root = parseXml(`<X a="1" b='two'/>`)
    expect(root.name).toBe("X")
    expect(root.attrs).toEqual({ a: "1", b: "two" })
  })

  it("handles self-closing siblings and nesting", () => {
    const root = parseXml(`<R><A x="1"/><A x="2"/><B><A x="3"/></B></R>`)
    expect(childrenNamed(root, "A")).toHaveLength(2) // only DIRECT children
    const b = def(firstNamed(root, "B"), "B")
    expect(childrenNamed(b, "A")[0]?.attrs["x"]).toBe("3")
  })

  it("captures element text content", () => {
    const root = parseXml(`<Resp><Status>Success</Status></Resp>`)
    expect(firstNamed(root, "Status")?.text).toBe("Success")
  })

  it("skips the xml prolog, comments and DOCTYPE", () => {
    const root = parseXml(
      `<?xml version="1.0"?>\n<!-- a comment --><!DOCTYPE x>\n<R a="1"><!-- inner --></R>`,
    )
    expect(root.name).toBe("R")
    expect(root.attrs["a"]).toBe("1")
  })

  it("decodes named, decimal and hex entities in attribute values", () => {
    const root = parseXml(`<X d="A &amp; B &lt;C&gt; &#65; &#x42; &quot;q&apos;"/>`)
    expect(root.attrs["d"]).toBe(`A & B <C> A B "q'`)
  })

  it("decodes entities in text content", () => {
    const root = parseXml(`<M>Procter &amp; Gamble</M>`)
    expect(root.text).toBe("Procter & Gamble")
  })

  it("throws ValidationError on malformed XML (unclosed tag)", () => {
    expect(() => parseXml(`<R><A x="1"></R>`)).toThrow(ValidationError)
  })

  it("throws ValidationError on junk input", () => {
    expect(() => parseXml(`not xml at all`)).toThrow(ValidationError)
  })
})

describe("parseXml — hardening", () => {
  it("leaves out-of-range numeric character references verbatim instead of crashing", () => {
    // > 0x10FFFF (decimal and hex) and the surrogate range must not throw.
    expect(parseXml(`<R a="&#x110000;"/>`).attrs["a"]).toBe("&#x110000;")
    expect(parseXml(`<R a="&#1114112;"/>`).attrs["a"]).toBe("&#1114112;")
    expect(parseXml(`<R a="&#xD800;"/>`).attrs["a"]).toBe("&#xD800;")
    expect(parseXml(`<M>&#xFFFFFF;</M>`).text).toBe("&#xFFFFFF;")
    // valid references still decode
    expect(parseXml(`<R a="&#65;&#x42;"/>`).attrs["a"]).toBe("AB")
  })

  it("keeps an attribute literally named __proto__ as an own property", () => {
    const root = parseXml(`<R __proto__="x"/>`)
    expect(Object.prototype.hasOwnProperty.call(root.attrs, "__proto__")).toBe(true)
    expect(root.attrs["__proto__"]).toBe("x")
  })
})

describe("parseSendRequestEnvelope", () => {
  const success = `<?xml version="1.0"?><FlexStatementResponse timestamp="x"><Status>Success</Status><ReferenceCode>1234567890</ReferenceCode><Url>https://gdcdyn.example/GetStatement</Url></FlexStatementResponse>`

  it("extracts status, referenceCode and url on success", () => {
    expect(parseSendRequestEnvelope(success)).toEqual({
      status: "Success",
      referenceCode: "1234567890",
      url: "https://gdcdyn.example/GetStatement",
    })
  })

  it("is case-insensitive about element names", () => {
    const lower = `<flexStatementResponse><status>Success</status><referenceCode>42</referenceCode><url>https://x/GetStatement</url></flexStatementResponse>`
    expect(parseSendRequestEnvelope(lower)).toEqual({
      status: "Success",
      referenceCode: "42",
      url: "https://x/GetStatement",
    })
  })

  it("extracts errorCode and errorMessage on failure", () => {
    const fail = `<FlexStatementResponse><Status>Fail</Status><ErrorCode>1019</ErrorCode><ErrorMessage>Statement generation in progress.</ErrorMessage></FlexStatementResponse>`
    expect(parseSendRequestEnvelope(fail)).toEqual({
      status: "Fail",
      errorCode: "1019",
      errorMessage: "Statement generation in progress.",
    })
  })
})

describe("statementRootName", () => {
  it("returns FlexQueryResponse for a completed statement", () => {
    expect(statementRootName(`<FlexQueryResponse queryName="q"></FlexQueryResponse>`)).toBe(
      "FlexQueryResponse",
    )
  })

  it("returns FlexStatementResponse for an in-progress/error envelope", () => {
    expect(
      statementRootName(`<FlexStatementResponse><Status>Fail</Status></FlexStatementResponse>`),
    ).toBe("FlexStatementResponse")
  })

  it("ignores the prolog when determining the root", () => {
    expect(statementRootName(`<?xml version="1.0"?><FlexQueryResponse/>`)).toBe("FlexQueryResponse")
  })
})

describe("extractStatements + single-row footgun", () => {
  const withN = (positions: string): string =>
    `<FlexQueryResponse><FlexStatements count="1"><FlexStatement accountId="U0" fromDate="20240101" toDate="20240131"><OpenPositions>${positions}</OpenPositions></FlexStatement></FlexStatements></FlexQueryResponse>`

  const rowsOf = (xml: string): readonly XmlElement[] => {
    const stmt = def(extractStatements(xml)[0], "statement")
    const open = def(firstNamed(stmt, "OpenPositions"), "OpenPositions")
    return childrenNamed(open, "OpenPosition")
  }

  it("returns FlexStatement nodes", () => {
    const stmts = extractStatements(withN(`<OpenPosition symbol="AAPL"/>`))
    expect(stmts).toHaveLength(1)
    expect(stmts[0]?.attrs["accountId"]).toBe("U0")
  })

  it("treats a single row and multiple rows uniformly as arrays", () => {
    expect(rowsOf(withN(`<OpenPosition symbol="AAPL"/>`))).toHaveLength(1)
    expect(
      rowsOf(withN(`<OpenPosition symbol="AAPL"/><OpenPosition symbol="MSFT"/>`)),
    ).toHaveLength(2)
  })

  it("returns every statement in a multi-account response", () => {
    const multi = `<FlexQueryResponse><FlexStatements count="2"><FlexStatement accountId="U1"/><FlexStatement accountId="U2"/></FlexStatements></FlexQueryResponse>`
    const stmts = extractStatements(multi)
    expect(stmts.map((s) => s.attrs["accountId"])).toEqual(["U1", "U2"])
  })
})
