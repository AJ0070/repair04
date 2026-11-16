import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { gunzipSync } from "node:zlib"
import {
  getFixedObstacleViolations,
  type FixedObstacleViolation,
  type FixedObstacleViolationInput,
} from "../lib/getFixedObstacleViolations"

test("preserve every fixed-copper finding on the real A13 DDR board", (): void => {
  const input: FixedObstacleViolationInput & {
    expectedViolations: FixedObstacleViolation[]
  } = JSON.parse(
    gunzipSync(
      readFileSync(
        new URL("./fixtures/assets/a13-fixed-copper.json.gz", import.meta.url),
      ),
    ).toString("utf8"),
  )
  expect(getFixedObstacleViolations(input)).toEqual(input.expectedViolations)
})
