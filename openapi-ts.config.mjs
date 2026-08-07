const output = process.env.LURANTA_SDK_GENERATED_OUTPUT ?? "src/generated"
const input = process.env.LURANTA_SDK_OPENAPI_INPUT ?? "../../apps/api/openapi/openapi.json"

export default {
  input,
  output: {
    clean: true,
    path: output,
  },
  plugins: [
    {
      name: "@hey-api/client-fetch",
    },
    {
      name: "@hey-api/typescript",
      enums: "javascript",
    },
    {
      name: "@hey-api/sdk",
      operations: {
        strategy: "single",
      },
    },
  ],
}
