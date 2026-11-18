import { expect, test } from "bun:test"
import { ClearancePathConnectivity } from "../lib/ClearancePathConnectivity"
import { FindClearancePathSolver } from "../lib/FindClearancePathSolver"
import {
  findClearancePath,
  type ClearancePathInput,
  type ClearancePathSearchStats,
} from "../lib/findClearancePath"
import { createPairedClearanceTask } from "./fixtures/pairedClearanceFixture"

function createAliasClearanceInput({
  connectedTo,
  owner,
}: {
  connectedTo: string[]
  owner: string
}): ClearancePathInput {
  const input = createPairedClearanceTask("detour").pathInput
  input.routes[0]!.connectionName = owner
  input.routes[0]!.rootConnectionName = owner
  input.srj.connections = [
    {
      name: "signal",
      rootConnectionName: "signal-root",
      pointsToConnect: [
        { x: -4, y: 0, layer: "top", pcb_port_id: "signal-pin" },
      ],
    },
    {
      name: "foreign",
      rootConnectionName: "foreign-root",
      pointsToConnect: [{ x: -4, y: 4, layer: "top" }],
    },
  ]
  input.srj.obstacles[0]!.connectedTo = connectedTo
  return input
}

test("obstacle alias shortcuts preserve native paths and route-local connectivity", (): void => {
  const aliasGroups: string[][] = [
    [],
    [""],
    ["", ""],
    ["unknown"],
    ["foreign"],
    ["foreign", "foreign-second"],
    ["", "foreign", ""],
    ["signal"],
    ["", "signal"],
    ["signal", ""],
    ["foreign", "signal"],
    ["signal", "foreign"],
    ["", "foreign", "signal", ""],
    ["signal-pin", "signal-root", "signal-pin"],
  ]
  for (const owner of ["signal", ""]) {
    for (const connectedTo of aliasGroups) {
      const input = createAliasClearanceInput({ connectedTo, owner })
      const original = structuredClone(input)
      const connectivity = new ClearancePathConnectivity(input.srj)
      // A joined search must not merge the following independent search.
      for (const joinForeign of [false, true, false]) {
        const routes = [...input.routes]
        if (joinForeign) {
          routes.push({
            ...input.routes[0]!,
            connectionName: "foreign",
            rootConnectionName: owner,
            route: [
              { x: -4, y: 4, z: 0 },
              { x: 4, y: 4, z: 0 },
            ],
          })
        }
        const referenceStats: ClearancePathSearchStats = {
          nodesPopped: 0,
          completionReason: "no-path",
        }
        const actualStats: ClearancePathSearchStats = {
          nodesPopped: 0,
          completionReason: "no-path",
        }
        // The synchronous implementation retains the original alias scan.
        const reference = findClearancePath({
          ...input,
          routes,
          stats: referenceStats,
        })
        const solver = new FindClearancePathSolver(
          { ...input, routes, stats: actualStats },
          connectivity,
        )
        solver.solve()
        expect(solver.failed).toBe(false)
        expect(solver.getOutput()).not.toBeNull()
        expect(solver.getOutput()).toEqual(reference)
        expect(actualStats).toEqual(referenceStats)
      }
      expect(input).toEqual(original)
    }
  }
})
