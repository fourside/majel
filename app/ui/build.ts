import * as esbuild from "esbuild";

const isWatch = Deno.args.includes("--watch");

const entryPoints = ["./ui/main.tsx"];
if (isWatch) {
  entryPoints.push("./ui/catalog.tsx");
}

const config: esbuild.BuildOptions = {
  entryPoints,
  bundle: true,
  outdir: "./dist",
  format: "esm",
  jsx: "automatic",
  jsxImportSource: "preact",
  entryNames: "[name]",
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
