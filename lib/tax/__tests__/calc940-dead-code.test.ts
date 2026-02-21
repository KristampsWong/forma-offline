/**
 * Bug 10: Dead code — dual calculateFederal940RequiresImmediate
 *
 * calc940.tsx previously exported a calculateFederal940RequiresImmediate function
 * with different semantics than the private version in payments.ts.
 * The exported version was never imported anywhere.
 *
 * Fix: The dead code has been removed. This test verifies it no longer exists
 * as an export from calc940.
 */
import { describe, it, expect } from "vitest"
import * as calc940Exports from "@/lib/tax/calc940"

describe("Bug 10: Dead code removed — calculateFederal940RequiresImmediate", () => {
  it("calculateFederal940RequiresImmediate is no longer exported from calc940", () => {
    expect(calc940Exports).not.toHaveProperty(
      "calculateFederal940RequiresImmediate",
    )
  })

  it("calc940 still exports its core functions", () => {
    expect(calc940Exports).toHaveProperty("calc940")
    expect(calc940Exports).toHaveProperty("calculatePaymentsExceedingLimit")
    expect(calc940Exports).toHaveProperty("getQuarterlyFUTATaxableWages")
  })
})
