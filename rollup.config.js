import typescript from '@rollup/plugin-typescript'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/asn1.js',
      format: 'esm',
      sourcemap: true
    }
  ],
  plugins: [
    typescript()
  ]
};
