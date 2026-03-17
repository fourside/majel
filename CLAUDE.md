# MAJEL

## Deploy Flow
1. Push/merge to main → GitHub Actions builds Docker image → CI creates PR to update k8s image tag
2. **Manual merge required** — github-actions[bot] PRs don't trigger CI, so required checks never pass
3. ArgoCD auto-syncs after merge

## Gotchas
- Hono JSR imports: use `@hono/hono` not `hono/` — Deno JSR prefix mapping breaks with version ranges
- Config `as const` makes literal types — service function params need explicit `number`/`string` annotations
- KSOPS: `kustomize.config.k8s.io/behavior: merge` annotation goes on the Secret resource, not the generator YAML
- esbuild SIGILL on QEMU ARM64: use `--platform=$BUILDPLATFORM` for builder stage in Dockerfile
