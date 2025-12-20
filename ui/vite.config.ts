import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writePortFile, dynamicDaemonProxy } from "./vite-plugins";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), writePortFile(), dynamicDaemonProxy()],
  server: {
    hmr: {
      path: "/vite-hmr",
      host: "localhost",
    },
  },
  build: {
    outDir: "../dist/ui",
    emptyOutDir: false,
    // Increase chunk size warning limit since ELK.js is inherently large
    // but already lazy-loaded via GraphViewer, so it doesn't affect initial bundle
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split React and React DOM into separate chunk
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react-vendor";
          }
          // Split React Flow (large graph library) into its own chunk
          if (id.includes("node_modules/@xyflow")) {
            return "react-flow";
          }
          // Split ELK.js (graph layout engine) into its own chunk
          if (id.includes("node_modules/elkjs")) {
            return "elk";
          }
        },
      },
    },
  },
});
