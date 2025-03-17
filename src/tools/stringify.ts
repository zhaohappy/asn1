import { Asn1SyntaxType, TagClass, TagType } from '../asn/defined'
import { Asn1Node } from './parser'

export interface StringifyOptions {
  indent: number
  typescript: boolean
  circles: string[]
}

function formatIdentifier(id: string) {
  return id.replace(/-/g, '_')
}

function formatNode(node: Asn1Node, options: StringifyOptions, depth: number = 0) {
  let result = ''

  function formatObject(items: Asn1Node[], depth: number, formatItem: (node: Asn1Node, options: StringifyOptions, depth: number) => string) {
    let result = ''
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'identifier' && options.circles.indexOf(items[i].referenceName) > -1) {
        result += `${' '.repeat((depth + 1) * options.indent)}get ${formatIdentifier(items[i].variableName)}() {\n${' '.repeat((depth + 2) * options.indent)}return ${formatItem(items[i], options, 0)}\n${' '.repeat((depth + 1) * options.indent)}}${(i === items.length - 1) ? '\n' : ',\n'}`
      }
      else {
        result += `${' '.repeat((depth + 1) * options.indent)}${/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(items[i].variableName) ? items[i].variableName : `'${items[i].variableName}'`}: ${formatItem(items[i], options, depth + 1)}${(i === items.length - 1) ? '\n' : ',\n'}`
      }
    }
    return result
  }

  switch (node.type) {
    case Asn1SyntaxType.Any:
      result = 'defined.Any()'
      break
    case Asn1SyntaxType.BMPString:
      result = 'defined.BMPString()'
      break
    case Asn1SyntaxType.Boolean: {
      result = 'defined.Boolean()'
      break
    }
    case Asn1SyntaxType.Integer: {
      result = 'defined.Integer()'
      break
    }
    case Asn1SyntaxType.VisibleString: {
      result = 'defined.VisibleString()'
      break
    }
    case Asn1SyntaxType.VideotexString: {
      result = 'defined.VideotexString()'
      break
    }
    case Asn1SyntaxType.UniversalTime: {
      result = 'defined.UniversalTime()'
      break
    }
    case Asn1SyntaxType.UniversalString: {
      result = 'defined.UniversalString()'
      break
    }
    case Asn1SyntaxType.UTF8String: {
      result = 'defined.UTF8String()'
      break
    }
    case Asn1SyntaxType.TeletexString: {
      result = 'defined.TeletexString()'
      break
    }
    case Asn1SyntaxType.Real: {
      result = 'defined.Real()'
      break
    }
    case Asn1SyntaxType.PrintableString: {
      result = 'defined.PrintableString()'
      break
    }
    case Asn1SyntaxType.OctetString: {
      result = 'defined.OctetString()'
      break
    }
    case Asn1SyntaxType.ObjectId: {
      result = 'defined.ObjectId()'
      break
    }
    case Asn1SyntaxType.IA5String: {
      result = 'defined.IA5String()'
      break
    }
    case Asn1SyntaxType.ExternalType: {
      result = 'defined.ExternalType()'
      break
    }
    case Asn1SyntaxType.Null: {
      result = 'defined.Null()'
      break
    }
    case Asn1SyntaxType.ObjectDescriptor: {
      result = 'defined.ObjectDescriptor()'
      break
    }
    case Asn1SyntaxType.GeneralisedTime: {
      result = 'defined.GeneralisedTime()'
      break
    }
    case Asn1SyntaxType.NumericString: {
      result = 'defined.NumericString()'
      break
    }
    case Asn1SyntaxType.GraphicString: {
      result = 'defined.GraphicString()'
      break
    }
    case Asn1SyntaxType.GeneralString: {
      result = 'defined.GeneralString()'
      break
    }
    case Asn1SyntaxType.EmbeddedPDV: {
      result = 'defined.EmbeddedPDV()'
      break
    }
    case Asn1SyntaxType.BitString: {
      if (node.namesBit) {
        let names = ''
        const keys = Object.keys(node.namesBit)
        for (let i = 0; i < keys.length; i++) {
          names += `${' '.repeat((depth + 1) * options.indent)}defined.BitStringIndex(${keys[i]}, ${node.namesBit[keys[i]]})${(i === keys.length - 1) ? '\n' : ',\n'}`
        }
        result = `defined.BitStringWithIndex([\n${names}${' '.repeat(depth * options.indent)}])`
      }
      else {
        result = 'defined.BitString()'
      }
      break
    }
    case Asn1SyntaxType.Enumeration: {
      function formatItem(node: Asn1Node, options: StringifyOptions, depth: number) {
        return `${' '.repeat(depth * options.indent)}defined.EnumerationValue(${node.value})`
      }
      if (node.extendable) {
        result = 'defined.EnumerationExt(\n'
        if (node.standardItems.length) {
          result += `${' '.repeat((depth + 1) * options.indent)}{\n${formatObject(node.standardItems, depth + 1, formatItem)}${' '.repeat((depth + 1) * options.indent)}},\n`
        }
        else {
          result += ' '.repeat((depth + 1) * options.indent) + '{},\n'
        }
        if (node.extItems.length) {
          result += `${' '.repeat((depth + 1) * options.indent)}{\n${formatObject(node.extItems, depth + 1, formatItem)}${' '.repeat((depth + 1) * options.indent)}}\n`
        }
        else {
          result += ' '.repeat((depth + 1) * options.indent) + '{}\n'
        }
        result += `${' '.repeat(depth * options.indent)})`
      }
      else {
        result = `defined.Enumeration({\n${formatObject(node.standardItems, depth, formatItem)}${' '.repeat(depth * options.indent)}})`
      }
      break
    }
    case Asn1SyntaxType.Choice: {
      let d = depth
      if (node.parameters) {
        d++
      }
      if (node.extendable) {
        result = 'defined.ChoiceExt(\n'
        if (node.standardItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.standardItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}},\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{},\n'
        }
        if (node.extItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.extItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}}\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{}\n'
        }
        result += `${' '.repeat(d * options.indent)})`
      }
      else {
        result = `defined.Choice({\n${formatObject(node.standardItems, d, formatNode)}${' '.repeat(d * options.indent)}})`
      }
      break
    }
    case Asn1SyntaxType.Sequence: {
      let d = depth
      if (node.parameters) {
        d++
      }
      if (node.extendable) {
        result = 'defined.SequenceExt(\n'
        if (node.standardItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.standardItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}},\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{},\n'
        }
        if (node.extItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.extItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}}\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{}\n'
        }
        result += `${' '.repeat(d * options.indent)})`
      }
      else {
        result = `defined.Sequence({\n${formatObject(node.standardItems, d, formatNode)}${' '.repeat(d * options.indent)}})`
      }
      break
    }
    case Asn1SyntaxType.Set: {
      let d = depth
      if (node.parameters) {
        d++
      }
      if (node.extendable) {
        result = 'defined.SetExt(\n'
        if (node.standardItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.standardItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}},\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{},\n'
        }
        if (node.extItems.length) {
          result += `${' '.repeat((d + 1) * options.indent)}{\n${formatObject(node.extItems, d + 1, formatNode)}${' '.repeat((d + 1) * options.indent)}}\n`
        }
        else {
          result += ' '.repeat((d + 1) * options.indent) + '{}\n'
        }
        result += `${' '.repeat(d * options.indent)})`
      }
      else {
        result = `defined.Set({\n${formatObject(node.standardItems, d, formatNode)}${' '.repeat(d * options.indent)}})`
      }
      break
    }
    case Asn1SyntaxType.SequenceOf: {
      result = `defined.SequenceOf(${(node.ofType.type === 'identifier' && options.circles.indexOf(node.ofType.referenceName) > -1) ? `() => ${formatNode(node.ofType, options, depth)}` : formatNode(node.ofType, options, depth)})`
      break
    }
    case Asn1SyntaxType.SetOf: {
      result = `defined.SetOf(${(node.ofType.type === 'identifier' && options.circles.indexOf(node.ofType.referenceName) > -1) ? `() => ${formatNode(node.ofType, options, depth)}` : formatNode(node.ofType, options, depth)})`
      break
    }
    case 'identifier': {
      if (node.arguments) {
        let args = ''
        for (let i = 0; i < node.arguments.length; i++) {
          args += node.arguments[i] + (i === node.arguments.length - 1) ? '' : ', '
        }
        result = `${formatIdentifier(node.referenceName)}(${args})`
      }
      else {
        if (node.withComponents) {
          let present = ''
          let absent = ''
          for (let i = 0; i < node.withComponents.present.length; i++) {
            present += `'${node.withComponents.present[i]}'${i === node.withComponents.present.length - 1 ? '' : ', '}`
          }
          for (let i = 0; i < node.withComponents.absent.length; i++) {
            absent += `'${node.withComponents.absent[i]}'${i === node.withComponents.absent.length - 1 ? '' : ', '}`
          }

          result = `defined.WithComponents(${formatIdentifier(node.referenceName)}, [${present ? present : '\'\''}], [${absent ? absent : '\'\''}])`
        }
        else {
          result = formatIdentifier(node.referenceName)
        }
      }
      break
    }
    case 'import': {
      node.imports.forEach((item) => {
        let names = ''
        for (let i = 0; i < item.names.length; i++) {
          names += `${item.names[i]}${i === item.names.length - 1 ? '' : ', '}`
        }
        result += `import { ${names} } from '${item.path}'\n`
      })

      break
    }
    case 'typeIdentifier': {
      result = `defined.TypeIdentifier(${formatIdentifier(node.referenceName)})`
      break
    }
  }

  if (node.constraint) {
    if (node.constraint.extendable) {
      result = `defined.Constraint(${result}, defined.ConstraintType.Extendable, ${node.constraint.min}, ${node.constraint.max})`
    }
    else {
      result = `defined.Constraint(${result}, defined.ConstraintType.Fixed, ${node.constraint.min}, ${node.constraint.max})`
    }
  }
  if (node.tag != null) {
    let args = ''
    if (node.tagType === TagType.Explicitly) {
      args += ', defined.TagType.Explicitly'
    }
    if (node.tagClass !== TagClass.ContextSpecific) {
      let name = ''
      switch (node.tagClass) {
        case TagClass.Application:
          name = 'Application'
          break
        case TagClass.Private:
          name = 'Private'
          break
        case TagClass.Universal:
          name = 'Universal'
          break
      }
      args += `, defined.TagClass.${name}`
    }
    result = `defined.Tag(${result}, ${node.tag}${args})`
  }
  if (node.charSet) {
    result = `defined.CharSet(${result}, \`${node.charSet}\`, defined.ConstraintType.Partially)`
  }
  if (node.optional) {
    result = `defined.Optional(${result}${node.default !== undefined ? `, ${node.default}` : ''})`
  }
  if (node.parameters) {
    let types = ''
    let parameters = ''
    for (let i = 0; i < node.parameters.length; i++) {
      if (options.typescript) {
        types += `T${i} extends defined.Asn1Syntax${i === node.parameters.length - 1 ? '' : ', '}`
        parameters += `${node.parameters[i]}?: T${i}${i === node.parameters.length - 1 ? '' : ', '}`
      }
      else {
        parameters += `${node.parameters[i]}${i === node.parameters.length - 1 ? '' : ', '}`
      }
    }
    if (options.typescript && types) {
      types = `<${types}>`
    }
    result = `function${types}(${parameters}) {\n${' '.repeat((depth + 1) * options.indent)}return ${result}\n${' '.repeat(depth * options.indent)}}`
  }
  return result
}

function topologicalSort(dependencies: Record<string, string[]>, imports: string[]) {
  const inDegree: Record<string, number> = {}
  const graph: Record<string, Set<string>> = {}
  const result: string[] = []
  const queue: string[] = []
  const circle: string[] = []

  Object.keys(dependencies).forEach((node) => {
    let c: string[] = []
    dependencies[node].forEach((dep) => {
      if (dependencies[dep]?.indexOf(node) > -1) {
        c.push(dep)
      }
    })
    if (c.length) {
      circle.push(...c)
      dependencies[node] = dependencies[node].filter((dep) => circle.indexOf(dep) === -1)
    }
    dependencies[node] = dependencies[node].filter((dep) => imports.indexOf(dep) === -1)
    graph[node] = new Set(dependencies[node])
    inDegree[node] = dependencies[node].length
  })

  Object.keys(inDegree).forEach((node) => {
    if (inDegree[node] === 0) {
      queue.push(node)
    }
  })

  while (queue.length > 0) {
    const node = queue.shift()
    result.push(node)

    Object.keys(graph).forEach((dep) => {
      if (graph[dep].has(node)) {
        graph[dep].delete(node)
        inDegree[dep]--
        if (inDegree[dep] === 0) {
          queue.push(dep)
        }
      }
    })
  }

  Object.keys(graph).forEach((node) => {
    if (graph[node].size) {
      result.push(node)
    }
  })

  return {
    queue: result,
    circle
  }
}

function sortNodes(nodes: Asn1Node[]) {
  const dependencies: Record<string, string[]> = {}
  const nodeMap: Record<string, Asn1Node> = {}

  const list: Asn1Node[] = []
  const imports: string[] = []

  nodes.forEach((node) => {
    if (node.variableName) {
      nodeMap[node.variableName] = node
      dependencies[node.variableName] = node.deps.slice() || []
    }
    else {
      if (node.type === 'import') {
        node.imports.forEach((item) => {
          imports.push(...item.names)
        })
      }
      list.push(node)
    }
  })

  const { queue } = topologicalSort(dependencies, imports)
  const circles: string[] = []

  const pre: Record<string, boolean> = {}

  queue.forEach((name) => {
    if (nodeMap[name].deps) {
      nodeMap[name].deps.forEach((dep) => {
        if (!pre[dep]
          && imports.indexOf(dep) === -1
          && circles.indexOf(dep) === -1
        ) {
          // list.push(dep)
          circles.push(dep)
        }
      })
    }
    list.push(nodeMap[name])
    pre[name] = true
  })

  return {
    list,
    circles
  }
}

export default function stringify(nodes: Asn1Node[], options: Omit<StringifyOptions, 'circles'> = {
  indent: 2,
  typescript: true
}) {
  let result = 'import { defined } from \'asn1\'\n\n'

  const { list, circles } = sortNodes(nodes)

  list.forEach((node) => {
    let format = formatNode(node, Object.assign({ circles }, options))
    if (node.variableName) {
      format = `export const ${formatIdentifier(node.variableName)} = ${format}`
    }
    format += '\n\n'
    result += format
  })

  // if (depsNodes) {
  //   depsNodes.forEach((node) => {
  //     result += `export let ${formatIdentifier(node.variableName)}${options.typescript ? ': defined.Asn1Syntax' : ''}\n\n`
  //   })

  //   depsNodes.forEach((node) => {
  //     let format = formatNode(node, options)
  //     if (node.variableName) {
  //       format = `${formatIdentifier(node.variableName)} = ${format}`
  //     }
  //     format += '\n\n'
  //     result += format
  //   })
  // }

  return result
}
