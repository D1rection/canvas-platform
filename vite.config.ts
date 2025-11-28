import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/canvas_platform/', // GitHub Pages 部署路径，改成你的仓库名
})
