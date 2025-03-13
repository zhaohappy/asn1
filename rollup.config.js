import typescript from '@rollup/plugin-typescript'
import dts from 'rollup-plugin-dts'

export default [
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/asn1.js',
        format: 'esm',
        sourcemap: true
      },
      {
        file: 'dist/asn1.umd.js',
        format: 'umd',
        name: 'Asn1'
      }
    ],
    plugins: [
      typescript()
    ]
  },
  {
    input: 'dist/index.d.ts',
    output: {
      file: 'dist/asn1.d.ts',
      format: 'es'
    },
    plugins: [dts()]
  }
]
