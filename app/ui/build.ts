import * as esbuild from "esbuild";

const isWatch = Deno.args.includes("--watch");

const config: esbuild.BuildOptions = {
  entryPoints: ["./ui/main.tsx"],
  bundle: true,
  outdir: "./dist",
  format: "esm",
  jsx: "automatic",
  jsxImportSource: "preact",
  entryNames: "bundle",
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("[esbuild] Watching for changes...");
} else {
  await esbuild.build(config);
  console.log("[esbuild] Build complete");
  esbuild.stop();
}
