import { expect, test } from "bun:test"
import { negotiateTraceClearance, type NegotiatedClearanceInput } from "../lib/negotiateTraceClearance"
import { NegotiateTraceClearanceSolver } from "../lib/NegotiateTraceClearanceSolver"
import { getSegmentToSegmentMinDistance as minimumDistanceBetweenSegments } from "../lib/getSegmentToSegmentMinDistance"

test("negotiation retains fixed copper as paths without copying or moving it", (): void => {
  const fixedRoute = {
    connectionName: "saved-data",
    traceThickness: 0.1,
    viaDiameter: 0.3,
    route: [{ x: -0.5, y: -1, z: 0 }, { x: 0.5, y: 1, z: 0 }],
    vias: [],
  }
  const original = structuredClone(fixedRoute)
  const route = {
    connectionName: "new-signal",
    traceThickness: 0.1,
    viaDiameter: 0.3,
    route: [{ x: -2, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }],
    vias: [],
  }
  const bounds = { minX: -5, maxX: 5, minY: -5, maxY: 5 }
  const input: NegotiatedClearanceInput = {
    srj: { bounds, layerCount: 2, minTraceWidth: 0.1, connections: [], obstacles: [] },
    routes: [route],
    fixedRoutes: [fixedRoute],
    bounds,
    dirtyRouteIndices: [0],
    isLocked: (): boolean => false,
    allowLayerChanges: false,
    traceClearance: 0.1,
    viaClearance: 0.1,
    maxPathSearchNodes: 30_000,
    maxPathSearchCalls: 16,
  }
  const result = negotiateTraceClearance(input)
  const solver = new NegotiateTraceClearanceSolver(input)
  solver.solve()
  expect(solver.solved).toBeTrue()
  expect(solver.getOutput()).toEqual(result)
  expect(result.routes).toHaveLength(1)
  expect(fixedRoute).toEqual(original)
  expect(result.routes[0]!.route[0]).toEqual(route.route[0])
  expect(result.routes[0]!.route.at(-1)).toEqual(route.route.at(-1))
  expect(result.routes[0]!.vias).toHaveLength(0)
  for (let index = 1; index < result.routes[0]!.route.length; index++) {
    const start = result.routes[0]!.route[index - 1]!
    const end = result.routes[0]!.route[index]!
    expect(start.z).toBe(0)
    expect(end.z).toBe(0)
    expect(minimumDistanceBetweenSegments(start, end, fixedRoute.route[0]!, fixedRoute.route[1]!)).toBeGreaterThanOrEqual(0.2 - 1e-8)
  }
})
