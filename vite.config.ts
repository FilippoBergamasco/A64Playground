import { defineConfig } from "vite";

export default defineConfig({
  // Relative asset URLs, so the build works when served from any subdirectory
  // (e.g. https://www.dais.unive.it/~bergamasco/A64Playground/), not just "/".
  base: "./",
});
