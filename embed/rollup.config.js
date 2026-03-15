import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

export default {
  input: 'src/embed.ts',
  output: {
    file: 'dist/embed.js',
    format: 'iife',
    name: 'SimplifyOpsEmbed',
    // IIFE — no exports, self-executing when loaded via <script>
    sourcemap: false,
  },
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      // Override for bundling (include both src files)
      include: ['src/**/*.ts'],
    }),
    terser({
      compress: {
        drop_console: false, // keep console.warn for user-facing errors
        passes: 2,
      },
      format: {
        comments: false,
      },
    }),
  ],
};
