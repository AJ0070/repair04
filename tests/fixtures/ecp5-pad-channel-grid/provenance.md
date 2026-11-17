Unmodified public native ECP5 DDR repair fixture from [tscircuit-autorouter](https://github.com/tscircuit/tscircuit-autorouter/blob/e423b98ef23dd59996a61d2f8b827eb0d1ea7dcf/tests/fixtures/assets/ecp5-fixed-copper-clearance.json.gz).

The grid repro reads the existing `input.srjWithPointPairs` request after the data bytes. Native pads, placement, completed copper, layer count and 0.089 mm copper rules are unchanged. It draws the actual clearance-grid axes over those obstacles; it does not reroute or simplify the board. Positions are millimetres, +X right and +Y up.
