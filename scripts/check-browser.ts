import { resolve } from "node:path"

const packageRoot = resolve(import.meta.dir, "..")
const entrypoint = resolve(packageRoot, "dist/index.js")

if (!(await Bun.file(entrypoint).exists())) {
  throw new Error("Build the TypeScript SDK before checking its browser bundle.")
}

const result = await Bun.build({
  entrypoints: [entrypoint],
  minify: false,
  target: "browser",
})

if (!result.success) {
  throw new AggregateError(result.logs, "The TypeScript SDK does not bundle for browsers.")
}
if (result.outputs.length !== 1) {
  throw new Error(`Expected one browser bundle, received ${result.outputs.length}.`)
}

const bundle = await result.outputs[0]!.text()
if (/["']node:[^"']+["']/.test(bundle)) {
  throw new Error("The browser SDK bundle imports a Node-only builtin.")
}
