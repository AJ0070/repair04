import { expect, test } from "bun:test"
import type {
  HighDensityRoute,
  SimpleRouteJson,
} from "high-density-repair03/lib"
import {
  createFixedObstacleViolationEvaluator,
  getFixedObstacleViolations,
} from "../lib/getFixedObstacleViolations"

test("fixed copper checks use declared wire and via clearances", (): void => {
  for (const scenario of [
    { declared: undefined, explicit: undefined, gap: 0.095, violations: 1 },
    { declared: undefined, explicit: undefined, gap: 0.105, violations: 0 },
    { declared: 0, explicit: undefined, gap: 0.005, violations: 0 },
    { declared: 0.089, explicit: undefined, gap: 0.094, violations: 0 },
    { declared: 0.089, explicit: undefined, gap: 0.084, violations: 1 },
    { declared: 0.15, explicit: undefined, gap: 0.145, violations: 1 },
    { declared: 0.089, explicit: 0.12, gap: 0.114, violations: 1 },
    { declared: undefined, explicit: 0.07, gap: 0.075, violations: 0 },
  ]) {
    const srj: SimpleRouteJson = {
      layerCount: 2,
      minTraceWidth: 0.1,
      minTraceToPadEdgeClearance: scenario.declared,
      minViaEdgeToPadEdgeClearance: scenario.declared,
      bounds: { minX: -2, maxX: 2, minY: -2, maxY: 2 },
      connections: [],
      obstacles: [
        {
          type: "rect",
          center: { x: 0, y: 0 },
          width: 1,
          height: 1,
          layers: ["top", "bottom"],
          connectedTo: ["fixed_copper"],
        },
      ],
    }
    const wireY = 0.5 + 0.05 + scenario.gap
    const viaY = 0.5 + 0.14 + scenario.gap
    const routes: HighDensityRoute[] = [
      {
        connectionName: "wire",
        traceThickness: 0.1,
        viaDiameter: 0.28,
        vias: [],
        route: [
          { x: -1, y: wireY, z: 0 },
          { x: 1, y: wireY, z: 0 },
        ],
      },
      {
        connectionName: "via",
        traceThickness: 0.1,
        viaDiameter: 0.28,
        vias: [{ x: 0, y: viaY }],
        route: [
          { x: 0, y: viaY, z: 0 },
          { x: 0, y: viaY, z: 1 },
        ],
      },
    ]
    const input = {
      srj,
      routes,
      traceClearance: scenario.explicit,
      viaClearance: scenario.explicit,
    }
    const violations = getFixedObstacleViolations(input)
    expect(violations.filter(({ kind }) => kind === "wire")).toHaveLength(
      scenario.violations,
    )
    expect(violations.filter(({ kind }) => kind === "via")).toHaveLength(
      scenario.violations,
    )
    expect(createFixedObstacleViolationEvaluator(input)(routes)).toEqual(
      violations,
    )
  }
})
