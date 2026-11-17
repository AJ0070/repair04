import { expect, test } from "bun:test"
import "bun-match-svg"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import { getSvgFromGraphicsObject, type GraphicsObject } from "graphics-debug"
import type { SimpleRouteJson } from "high-density-repair03/lib"
import { getClearanceGridAxes } from "../lib/getClearanceGridAxes"

type NativeObstacle = SimpleRouteJson["obstacles"][number] & {
  componentId?: string
}

type NativeSrj = Omit<SimpleRouteJson, "obstacles"> & {
  obstacles: NativeObstacle[]
}

function obstacleColor(obstacle: NativeObstacle): string {
  if (obstacle.componentId) return "rgba(220, 38, 38, 0.55)"
  if (obstacle.shape === "circle") return "#2563eb"
  return "#94a3b8"
}

// Native board-world positions in mm, +X right and +Y up.
test("native ECP5 clearance grid after the data phases", async (): Promise<void> => {
  const fixture = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL(
          "./fixtures/ecp5-pad-channel-grid/input.json.gz",
          import.meta.url,
        ),
      ),
    ).toString(),
  ) as { input: { srjWithPointPairs: NativeSrj } }
  const srj = fixture.input.srjWithPointPairs
  const axes = getClearanceGridAxes({
    srj,
    bounds: srj.bounds,
    gridSize: srj.minTraceWidth * 2,
  })
  expect(axes.hasPadChannels).toBe(true)

  // Crop the drawing to the native copper; retain the complete search bounds.
  const viewport = {
    minX: Math.min(...srj.obstacles.map((pad) => pad.center.x - pad.width)) - 1,
    maxX: Math.max(...srj.obstacles.map((pad) => pad.center.x + pad.width)) + 1,
    minY: Math.min(...srj.obstacles.map((pad) => pad.center.y - pad.height)) - 1,
    maxY: Math.max(...srj.obstacles.map((pad) => pad.center.y + pad.height)) + 1,
  }
  const graphics: GraphicsObject = {
    coordinateSystem: "cartesian",
    rects: srj.obstacles
      .filter((pad) => pad.shape !== "circle")
      .map((pad) => ({
        center: pad.center,
        width: pad.width,
        height: pad.height,
        ccwRotationDegrees: pad.ccwRotationDegrees,
        fill: obstacleColor(pad),
      })),
    circles: srj.obstacles
      .filter((pad) => pad.shape === "circle")
      .map((pad) => ({
        center: pad.center,
        radius: pad.width / 2,
        fill: obstacleColor(pad),
      })),
    lines: [
      ...axes.xs
        .filter((x) => x >= viewport.minX && x <= viewport.maxX)
        .map((x) => ({
          points: [
            { x, y: viewport.minY },
            { x, y: viewport.maxY },
          ],
          strokeColor: "rgba(8, 145, 178, 0.18)",
          strokeWidth: srj.minTraceWidth,
        })),
      ...axes.ys
        .filter((y) => y >= viewport.minY && y <= viewport.maxY)
        .map((y) => ({
          points: [
            { x: viewport.minX, y },
            { x: viewport.maxX, y },
          ],
          strokeColor: "rgba(8, 145, 178, 0.18)",
          strokeWidth: srj.minTraceWidth,
        })),
    ],
    texts: [
      {
        x: viewport.minX,
        y: viewport.maxY + 1,
        text: `Native ECP5 candidate grid: ${axes.xs.length} × ${axes.ys.length} × ${srj.layerCount} layers`,
        fontSize: 0.55,
        color: "#0f172a",
        anchorSide: "center_left",
      },
    ],
  }
  const svg = getSvgFromGraphicsObject(graphics, {
    backgroundColor: "white",
    svgWidth: 1100,
    svgHeight: 850,
  })
  await expect(svg).toMatchSvgSnapshot(import.meta.path)
})
