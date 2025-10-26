import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  // GitHub Pages base path (repository name)
  base: process.env.NODE_ENV === 'production' ? '/game_CMW/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'esbuild',
    sourcemap: false,
    cssCodeSplit: true,
    // 청크 크기 경고 제한 증가 (PixiJS 때문)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // PixiJS를 별도 청크로 분리 (브라우저 캐싱 활용)
          pixi: ['pixi.js'],
        },
        // 파일명에 해시 추가로 캐싱 최적화
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
    // esbuild 최적화 옵션
    esbuild: {
      drop: ['debugger'], // 프로덕션에서 debugger 제거
      legalComments: 'none', // 라이센스 주석 제거
    },
  },
  server: {
    port: 3000,
    host: true,
  },
});
