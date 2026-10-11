# Stockfish.js 19.0.1

Vendored single-threaded lite WASM build, used for both play and analysis.
The `.js` and `.wasm` files must stay together and retain their names.
Serve them as JavaScript and `application/wasm`, respectively.

- Upstream and complete corresponding source: https://github.com/nmrugg/stockfish.js/tree/v19.0.1
- Source archive: https://github.com/nmrugg/stockfish.js/archive/refs/tags/v19.0.1.tar.gz
- Package: https://www.npmjs.com/package/stockfish/v/19.0.1
- License: GNU GPL v3, see `COPYING.txt`.
- Original assets: https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.js and https://unpkg.com/stockfish@19.0.1/bin/stockfish-19-lite-single.wasm

The upstream notices embedded in the JavaScript are preserved. No engine source
or binary modifications were made. This build needs no shared memory or
cross-origin isolation headers and performs its calculations on the device.
