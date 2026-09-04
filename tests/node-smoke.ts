import assert from "node:assert/strict"
import test from "node:test"

import { Luranta, TransportError } from "@luranta/sdk"

void test("the built SDK runs with Node Fetch", async () => {
  const luranta = new Luranta({
    apiKey: "lur_test_node",
    fetch: async () =>
      new Response(
        JSON.stringify({
          data: [{ code: "backend", label: "Backend", object: "tool" }],
          has_more: false,
          next_cursor: null,
          object: "list",
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
        },
      ),
  })

  const page = await luranta.tools.list({ query: "back" })
  assert.equal(page.data[0]?.code, "backend")
})

void test("Node network failures surface without a retry", async () => {
  let calls = 0
  const luranta = new Luranta({
    apiKey: "lur_test_node",
    fetch: async () => {
      calls += 1
      throw new TypeError("connection reset")
    },
    maxRetries: 5,
  })

  await assert.rejects(luranta.tools.list({ query: "back" }), TransportError)
  assert.equal(calls, 1)
})
