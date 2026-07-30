// Some of sockjs-client's transitive dependencies assume they're running
// under Node and reference the global `global` object directly. Older
// webpack-based Angular builds polyfilled this automatically; the current
// esbuild-based builder does not, which surfaces as:
//   ReferenceError: global is not defined
//
// This file must be the very first import in main.ts so the shim runs
// before any other module (including JobSocketService -> sockjs-client)
// gets evaluated.
(window as any).global = window;
