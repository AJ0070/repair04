import { expect, test } from "bun:test"
import "bun-match-svg"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { getSvgFromGraphicsObject, type GraphicsObject } from "graphics-debug"
import type {
  HighDensityRoute,
  SimpleRouteJson,
} from "high-density-repair03/lib"
import { ClearancePathConnectivity } from "../lib/ClearancePathConnectivity"
import { FindClearancePathSolver } from "../lib/FindClearancePathSolver"

class CountingConnectivity extends ClearancePathConnectivity {
  resolutions = 0

  override createNetResolver(
    routes: readonly HighDensityRoute[],
  ): (name: string) => string {
    const net = super.createNetResolver(routes)
    return (name: string): string => {
      this.resolutions++
      return net(name)
    }
  }
}

test("native OrangeCrab clearance search resolves repeated pad aliases", async (): Promise<void> => {
  const srj = JSON.parse(
    gunzipSync(
      new Uint8Array(
        readFileSync(
          new URL(
            "./fixtures/orangecrab-clearance-connectivity/input.srj.json.gz",
            import.meta.url,
          ),
        ),
      ),
    ).toString(),
  ) as SimpleRouteJson
  // Endpoints of an emitted top-layer segment, in native board coordinates.
  const route: HighDensityRoute = {
    connectionName: "source_net_95",
    rootConnectionName: "source_net_95",
    traceThickness: 0.089,
    viaDiameter: 0.28,
    vias: [],
    route: [
      { x: 1.1310523676080066, y: -8.445141832287852, z: 0 },
      { x: 8.429318671975786, y: -8.445141832287852, z: 0 },
    ],
  }
  const connectivity = new CountingConnectivity(srj)
  const solver = new FindClearancePathSolver(
    {
      srj,
      routes: [route],
      routeIndex: 0,
      start: route.route[0]!,
      end: route.route[1]!,
      bounds: srj.bounds,
      traceThickness: route.traceThickness,
      traceClearance: 0.089,
      viaClearance: 0.089,
      gridSize: 0.178,
      heuristicWeight: 3,
      allowLayerChanges: false,
      maxNodes: 30_000,
    },
    connectivity,
  )
  solver.solve()
  expect(solver.failed).toBe(false)
  const path = solver.getOutput()
  expect(path).not.toBeNull()
  expect({ path, stats: solver.stats }).toMatchSnapshot()

  const pads = srj.obstacles.filter(
    (obstacle): boolean =>
      obstacle.layers.includes("top") &&
      obstacle.center.x >= srj.bounds.minX &&
      obstacle.center.x <= srj.bounds.maxX &&
      obstacle.center.y >= srj.bounds.minY &&
      obstacle.center.y <= srj.bounds.maxY,
  )
  const graphics: GraphicsObject = {
    coordinateSystem: "cartesian",
    rects: pads
      .filter((pad): boolean => pad.shape !== "circle")
      .map((pad) => ({
        center: pad.center,
        width: pad.width,
        height: pad.height,
        ccwRotationDegrees: pad.ccwRotationDegrees,
        fill: "rgba(220, 38, 38, 0.45)",
      })),
    circles: pads
      .filter((pad): boolean => pad.shape === "circle")
      .map((pad) => ({
        center: pad.center,
        radius: pad.width / 2,
        fill: "rgba(220, 38, 38, 0.45)",
      })),
    lines: [
      {
        points: path!,
        strokeWidth: route.traceThickness,
        strokeColor: "#dc2626",
      },
    ],
    texts: [
      {
        x: srj.bounds.minX,
        y: srj.bounds.maxY + 0.8,
        text: `OrangeCrab: ${connectivity.resolutions.toLocaleString("en-US")} alias resolutions; ${solver.stats.nodesPopped} search nodes`,
        fontSize: 0.3,
        anchorSide: "center_left",
        color: "#0f172a",
      },
    ],
  }
  await expect(
    getSvgFromGraphicsObject(graphics, {
      backgroundColor: "white",
      svgWidth: 1000,
      svgHeight: 1000,
    }),
  ).toMatchSvgSnapshot(import.meta.path)
})
