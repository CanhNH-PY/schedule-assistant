const { defineConfig, externalizeDepsPlugin } = require('electron-vite')
const react = require('@vitejs/plugin-react')
const { resolve } = require('path')

module.exports = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(__dirname, 'dist-electron'),
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'electron/main.ts'),
        formats: ['cjs'],
        fileName: () => 'main.js'
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: resolve(__dirname, 'dist-electron'),
      emptyOutDir: false,
      lib: {
        entry: resolve(__dirname, 'electron/preload.ts'),
        formats: ['cjs'],
        fileName: () => 'preload.js'
      }
    }
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react.default ? react.default() : react()],
    build: {
      outDir: resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/index.html')
      }
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    }
  }
})
