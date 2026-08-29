---
name: v8-jit
description: Evidence-driven V8 optimization and deoptimization diagnosis for the pinned Node.js 26 runtime.
metadata:
  tags: v8, jit, optimization, deoptimization, inline-cache
---

# V8 and JIT Diagnosis

## Use traces only after a CPU profile

V8 tiering and heuristics change with the engine embedded in Node. Do not assume a fixed compiler pipeline, warm-up threshold, object-layout rule, or deoptimization status code. Confirm the active V8 version and available flags:

```bash
node --v8-options
```

For a minimal reproduction of a dominant JavaScript hotspot, `--trace-opt` and `--trace-deopt` can show optimization activity and bailout reasons when the active runtime lists them. Keep the input and warm-up representative, and bound the trace output.

Optimization and occasional deoptimization are normal. Act only when the same hot function repeatedly deoptimizes or the trace explains a material profile hotspot.

## Interpret evidence narrowly

| Repeated signal | Investigation |
| --- | --- |
| Object-map or shape mismatch | Compare actual caller shapes, property creation order, and optional fields at the hot access site. |
| Type mismatch or numeric transition | Normalize and validate the hot-path input at its owning boundary. Preserve required JavaScript semantics. |
| Sparse or changing array representation | Check whether holes or mixed element types are necessary and measured. |
| Insufficient feedback or cold code | Verify that the benchmark includes realistic warm-up and call diversity. |
| Heavy compilation without steady-state gain | Check short-lived processes, generated code, and workload granularity before changing source. |

Prefer algorithmic improvements and fewer allocations over engine-shaped rewrites. If stable shapes matter, use clear object factories or literals with consistent fields; this repository rejects class syntax. Do not replace readable polymorphic code unless the measured gain is material.

## Diagnostic boundaries

- Do not commit `%` native syntax, `--allow-natives-syntax`, `v8.setFlagsFromString()`, private bindings, or engine-specific status bitmasks.
- Do not copy deoptimization remedies from another V8 version without reproducing the same reason locally.
- Do not treat a successful optimization trace as proof of faster end-to-end behavior.
- Re-run the CPU profile and the representative benchmark after each change, including correctness and memory checks.
- Remove diagnostic flags after the investigation; verbose V8 tracing is not a production operating mode.
