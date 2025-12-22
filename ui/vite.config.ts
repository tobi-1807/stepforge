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
        },
      },
    },
  },
});
