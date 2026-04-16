import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const frontendEnv = loadEnv(mode, process.cwd(), "")
  const backendEnv = loadEnv(mode, path.resolve(__dirname, "../backend"), "")
  const googleClientId =
    frontendEnv.VITE_GOOGLE_CLIENT_ID ||
    backendEnv.VITE_GOOGLE_CLIENT_ID ||
    backendEnv.GOOGLE_CLIENT_ID ||
    ""

  return {
    plugins: [react()],
    define: {
      "import.meta.env.VITE_GOOGLE_CLIENT_ID": JSON.stringify(googleClientId),
    },
    server: {
      port: 5173,
      strictPort: false,
    },
  }
})
