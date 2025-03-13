import stringify from '../src/tools/stringify'
import parse from '../src/tools/parser'
import * as fs from 'fs'
import * as path from 'path'

const distPath = path.join(__dirname, './__test__cache')

describe('parser', () => {

  let output: string

  beforeAll(() => {
    if (!fs.existsSync(distPath)) {
      fs.mkdirSync(distPath, { recursive: true })
    }
    output = path.join(distPath, './output.ts')
  })

  afterAll(() => {
    fs.unlinkSync(output)
  })

  test('h235 ', () => {
    const nodes = parse(fs.readFileSync(path.join(__dirname, './asn/h235.asn'), 'utf-8'))
    const result = stringify(nodes)
    // fs.writeFileSync(output, result)
  })

  test('h245 ', () => {
    const nodes = parse(fs.readFileSync(path.join(__dirname, './asn/h245.asn'), 'utf-8'))
    const result = stringify(nodes)
    // fs.writeFileSync(output, result)
  })

  test('h225 ', () => {
    const nodes = parse(fs.readFileSync(path.join(__dirname, './asn/h225.asn'), 'utf-8'))
    const result = stringify(nodes)
    // fs.writeFileSync(output, result)
  })
})