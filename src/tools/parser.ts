import { Asn1SyntaxType, TagClass, TagType } from '../asn/defined'

export interface Asn1Node {
  type: Asn1SyntaxType | 'typeIdentifier' | 'import' | 'identifier'
  variableName?: string
  constraint?: {
    min: number
    max: number
    extendable: boolean
  }
  extendable?: boolean
  constrainedBy?: string[]
  optional?: boolean
  referenceName?: string
  standardItems?: Asn1Node[]
  extItems?: Asn1Node[]
  arguments?: string[]
  withComponents?: {
    present: string[]
    absent: string[]
  }
  imports?: {
    path: string
    names: string[]
  }[]
  charSet?: string
  tag?: number
  tagType?: TagType
  tagClass?: TagClass
  value?: number
  parameters?: string[]
  ofType?: Asn1Node
  namesBit?: Record<string, number>
  default?: any
  deps: string[]
}

class Parser {

  private source: string
  private pos: number

  private begin: boolean
  private end: boolean
  private objectParsing: boolean
  private objectDepth: number
  private deps: string[]

  public parse(source: string) {
    this.source = source
    this.pos = 0
    this.begin = false
    this.end = false
    this.objectDepth = 0
    this.deps = []

    const nodes: Asn1Node[] = []

    while (!this.end && this.pos < this.source.length) {
      this.skipWhitespace()
      const identifier = this.readIdentifier()

      switch (identifier) {
        case '--':
          this.skipComment()
          break
        case 'BEGIN':
          this.begin = true
          break
        case 'END':
          this.end = true
          break
        case 'IMPORTS':
          nodes.push(this.readImports())
          break
        default:
          if (this.begin) {
            let next = this.readIdentifier()
            const parameters = this.readArgument()
            if (parameters) {
              next = this.readIdentifier()
            }
            if (next === '::=') {
              const type = this.readIdentifier()
              this.deps.length = 0
              const node = this.readElement(type)
              node.variableName = identifier
              if (parameters) {
                node.parameters = parameters.split(',').map((s) => s.trim())
              }
              if (node.parameters) {
                node.deps = this.deps.filter((dep) => {
                  return node.parameters.indexOf(dep) === -1
                })
              }
              else {
                node.deps = this.deps.slice()
              }
              nodes.push(node)
            }
            else {
              throw new Error('invalid syntax')
            }
          }
          else if (!identifier) {
            this.pos++
          }
          break
      }
    }
    return nodes
  }

  private pickNextChar() {
    while (this.pos < this.source.length) {
      this.checkComment()
      if (/\S/.test(this.source[this.pos])) {
        return this.source[this.pos]
      }
      this.pos++
    }
    return ''
  }

  private readCommand() {
    while (this.source[this.pos] === ' ') {
      this.pos++
    }
    let command = ''
    if (this.source[this.pos] === '(') {
      this.pos++
      this.skipWhitespace()
      this.checkComment()
      let layer = 1
      while (this.pos < this.source.length && (this.source[this.pos] !== ')' || layer !== 1)) {
        if (this.source[this.pos] === '(') {
          layer++
        }
        this.checkComment()

        if (this.source[this.pos] === ')') {
          if (layer === 1) {
            break
          }
          layer--
        }
        command += this.source[this.pos++]
      }
      this.pos++
    }
    return command
  }

  private readArgument() {
    while (this.source[this.pos] === ' ') {
      this.pos++
    }
    let command = ''
    if (this.source[this.pos] === '{') {
      this.pos++
      this.skipWhitespace()
      this.checkComment()
      let layer = 1
      while (this.pos < this.source.length && (this.source[this.pos] !== '}' || layer !== 1)) {
        if (this.source[this.pos] === '{') {
          layer++
        }
        this.checkComment()
        if (this.source[this.pos] === '}') {
          if (layer === 1) {
            break
          }
          layer--
        }
        command += this.source[this.pos++]
      }
      this.pos++
    }
    return command
  }

  private readTag() {
    while (this.source[this.pos] === ' ') {
      this.pos++
    }
    let command = ''
    if (this.source[this.pos] === '[') {
      this.pos++
      this.skipWhitespace()
      this.checkComment()
      while (this.pos < this.source.length && this.source[this.pos] !== ']') {
        this.checkComment()
        if (this.source[this.pos] === ']') {
          break
        }
        command += this.source[this.pos++]
      }
      this.pos++
    }
    return command
  }

  private readObject() {
    const standardItems: Asn1Node[] = []
    const extItem: Asn1Node[] = []
    let hasExt = false
    this.objectParsing = true
    this.objectDepth++

    if (this.pickNextChar() === '{') {
      this.skipWhitespace()
      this.checkComment()
      this.pos++
    }

    while (true) {
      this.skipWhitespace()
      this.checkComment()
      if (this.source[this.pos] === '}') {
        this.pos++
        break
      }
      else if (this.source[this.pos] === ',') {
        this.pos++
      }
      const identifier = this.readIdentifier()

      if (identifier === '...') {
        hasExt = true
        continue
      }

      const key = identifier

      let tag: number
      let tagClass: TagClass
      let tagType: TagType

      const tagCommand = this.readTag()
      if (tagCommand) {
        const items = tagCommand.trim().split(' ')
        if (items.length === 2) {
          switch (items[0]) {
            case 'UNIVERSAL':
              tagClass = TagClass.Universal
              break
            case 'APPLICATION':
              tagClass = TagClass.Application
              break
            case 'PRIVATE':
              tagClass = TagClass.Private
              break
            default:
              tagClass = TagClass.ContextSpecific
              break
          }
          tag = +items[1]
        }
        else {
          tag = +items[0]
        }
      }

      let type = this.readIdentifier()

      if (type === 'IMPLICIT') {
        tagType = TagType.Implicitly
        type = this.readIdentifier()
      }
      else if (type === 'EXPLICIT') {
        tagType = TagType.Explicitly
        type = this.readIdentifier()
      }

      const value = this.readElement(type)

      value.variableName = key
      value.tag = tag
      value.tagClass = tagClass
      value.tagType = tagType

      if (hasExt) {
        extItem.push(value)
      }
      else {
        standardItems.push(value)
      }
    }

    const command = this.readCommand()
    if (command) {
      if (/CONSTRAINED\s+BY/.test(command)) {
        // TODO
      }
    }
    this.objectDepth--
    if (this.objectDepth === 0) {
      this.objectParsing = false
    }
    return {
      standardItems,
      extItem,
      hasExt
    }
  }

  private parseConstraint(node: Asn1Node, constraint: string) {

    function parseInteger(value: string) {
      value = value.toLowerCase()
      if (value === 'min') {
        return -Infinity
      }
      else if (value === 'max') {
        return Infinity
      }
      return +value
    }

    const match = constraint.match(/\((.*?)\)/)
    if (match) {
      node.constraint = {
        min: 0,
        max: 0,
        extendable: false
      }
      const items = match[1].split(',')
      items.forEach((item) => {
        if (item.trim() === '...') {
          node.constraint.extendable = true
        }
        else {
          const list = item.trim().split('..')
          if (list.length === 2) {
            node.constraint.min = parseInteger(list[0])
            node.constraint.max = parseInteger(list[1])
          }
          else {
            node.constraint.min = parseInteger(list[0])
            node.constraint.max = parseInteger(list[0])
          }
        }
      })
    }
    else {
      throw new Error('invalid constraint syntax')
    }
  }

  private parseCommand(node: Asn1Node) {
    while (true) {
      const command = this.readCommand()
      if (command) {
        if (/^SIZE/.test(command)) {
          this.parseConstraint(node, command)
        }
        else if (/^FROM/.test(command)) {
          let match = command.match(/\((.*?)\)/)
          if (match) {
            match = match[1].match(/"(.*?)"/)
            if (match) {
              node.charSet = match[1]
            }
          }
        }
        else if (/^WITH\s+COMPONENTS/.test(command)) {
          const match = command.match(/\{(.*?)\}/)
          if (match) {
            node.withComponents = {
              present: [],
              absent: []
            }
            const list = match[1].split(',')
            for (let i = 0; i < list.length; i++) {
              const s = list[i].trim()
              if (s !== '...') {
                const items = s.split(/\s+/)
                if (items.length === 2) {
                  if (items[1] === 'PRESENT') {
                    node.withComponents.present.push(items[0])
                  }
                  else if (items[1] === 'ABSENT') {
                    node.withComponents.absent.push(items[0])
                  }
                }
              }
            }
          }
        }
      }
      else {
        break
      }
    }
  }

  private readElement(type: string) {
    const node: Asn1Node = {
      type: Asn1SyntaxType.Any,
      deps: []
    }

    switch (type) {
      case 'CHOICE': {
        const { standardItems, extItem, hasExt } = this.readObject()
        node.type = Asn1SyntaxType.Choice
        node.standardItems = standardItems
        node.extItems = extItem
        if (hasExt) {
          node.extendable = true
        }
        break
      }
      case 'SEQUENCE': {
        const nextChar = this.pickNextChar()
        if (nextChar === '{') {
          const { standardItems, extItem, hasExt } = this.readObject()
          node.type = Asn1SyntaxType.Sequence
          node.standardItems = standardItems
          node.extItems = extItem
          if (hasExt) {
            node.extendable = true
          }
        }
        else {
          if (nextChar === '(') {
            this.parseCommand(node)
          }
          const next = this.readIdentifier()
          if (next === 'OF') {
            node.type = Asn1SyntaxType.SequenceOf
          }
          else if (/^SIZE/.test(next)) {
            node.type = Asn1SyntaxType.SequenceOf
            const command = this.readCommand()
            if (command) {
              this.parseConstraint(node, `(${command})`)
            }
            // skip OF
            this.readIdentifier()
          }
          else {
            throw new Error('invalid syntax')
          }
          const type = this.readIdentifier()
          node.ofType = this.readElement(type)
          if (node.ofType.optional) {
            node.optional = true
            node.ofType.optional = false
          }
        }
        break
      }
      case 'SET': {
        const nextChar = this.pickNextChar()
        if (nextChar === '{') {
          const { standardItems, extItem, hasExt } = this.readObject()
          node.type = Asn1SyntaxType.Set
          node.standardItems = standardItems
          node.extItems = extItem
          if (hasExt) {
            node.extendable = true
          }
        }
        else {
          if (nextChar === '(') {
            this.parseCommand(node)
          }
          const next = this.readIdentifier()
          if (next === 'OF') {
            node.type = Asn1SyntaxType.SetOf
          }
          else if (/^SIZE/.test(next)) {
            node.type = Asn1SyntaxType.SetOf
            const command = this.readCommand()
            if (command) {
              this.parseConstraint(node, `(${command})`)
            }
            // skip OF
            this.readIdentifier()
          }
          else {
            throw new Error('invalid syntax')
          }
          const type = this.readIdentifier()
          node.ofType = this.readElement(type)
          if (node.ofType.optional) {
            node.optional = true
            node.ofType.optional = false
          }
        }
        break
      }
      case 'OCTET': {
        const next = this.readIdentifier()
        if (next === 'STRING') {
          node.type = Asn1SyntaxType.OctetString
          const command = this.readCommand()
          if (command) {
            if (/^SIZE/.test(command)) {
              this.parseConstraint(node, command)
            }
          }
        }
        else {
          node.type = 'identifier'
          node.referenceName = 'OCTET'
          if (this.deps.indexOf(node.referenceName) === -1) {
            this.deps.push(node.referenceName)
          }
        }
        break
      }
      case 'BIT': {
        const next = this.readIdentifier()
        if (next === 'STRING') {
          node.type = Asn1SyntaxType.BitString

          if (this.pickNextChar() === '{') {
            this.skipWhitespace()
            this.checkComment()
            this.pos++
            node.namesBit = {}

            while (true) {
              this.skipWhitespace()
              if (this.source[this.pos] === '}') {
                this.pos++
                break
              }
              else if (this.source[this.pos] === ',') {
                this.pos++
              }
              const identifier = this.readIdentifier()
              const command = this.readCommand()
              node.namesBit[identifier] = +command
            }
          }

          const command = this.readCommand()
          if (command) {
            if (/^SIZE/.test(command)) {
              this.parseConstraint(node, command)
            }
          }
        }
        else {
          node.type = 'identifier'
          node.referenceName = 'BIT'
          if (this.deps.indexOf(node.referenceName) === -1) {
            this.deps.push(node.referenceName)
          }
        }
        break
      }
      case 'INTEGER': {
        node.type = Asn1SyntaxType.Integer
        const command = this.readCommand()
        if (command) {
          this.parseConstraint(node, `(${command})`)
        }
        break
      }
      case 'OBJECT': {
        const next = this.readIdentifier()
        if (next === 'IDENTIFIER') {
          node.type = Asn1SyntaxType.ObjectId
        }
        else {
          node.type = 'identifier'
          node.referenceName = 'OBJECT'
          if (this.deps.indexOf(node.referenceName) === -1) {
            this.deps.push(node.referenceName)
          }
        }
        break
      }
      case 'NumericString': {
        node.type = Asn1SyntaxType.NumericString
        this.parseCommand(node)
        break
      }
      case 'BMPString': {
        node.type = Asn1SyntaxType.BMPString
        this.parseCommand(node)
        break
      }
      case 'GraphicString': {
        node.type = Asn1SyntaxType.GraphicString
        this.parseCommand(node)
        break
      }
      case 'VisibleString': {
        node.type = Asn1SyntaxType.VisibleString
        this.parseCommand(node)
        break
      }
      case 'GeneralString': {
        node.type = Asn1SyntaxType.GeneralString
        this.parseCommand(node)
        break
      }
      case 'UniversalString': {
        node.type = Asn1SyntaxType.UniversalString
        this.parseCommand(node)
        break
      }
      case 'PrintableString': {
        node.type = Asn1SyntaxType.PrintableString
        this.parseCommand(node)
        break
      }
      case 'TeletexString': {
        node.type = Asn1SyntaxType.TeletexString
        this.parseCommand(node)
        break
      }
      case 'VideotexString': {
        node.type = Asn1SyntaxType.VideotexString
        this.parseCommand(node)
        break
      }
      case 'UTF8String': {
        node.type = Asn1SyntaxType.UTF8String
        this.parseCommand(node)
        break
      }
      case 'IA5String': {
        node.type = Asn1SyntaxType.IA5String
        this.parseCommand(node)
        break
      }
      case 'NULL': {
        node.type = Asn1SyntaxType.Null
        break
      }
      case 'BOOLEAN': {
        node.type = Asn1SyntaxType.Boolean
        break
      }
      case 'TYPE-IDENTIFIER.&Type': {
        node.type = 'typeIdentifier'
        node.referenceName = this.readCommand().trim()
        if (this.deps.indexOf(node.referenceName) === -1) {
          this.deps.push(node.referenceName)
        }
        break
      }
      case 'ANY': {
        node.type = Asn1SyntaxType.Any
        break
      }
      case 'ENUMERATED': {
        let index = 0
        const standardItems: Asn1Node[] = []
        const extItem: Asn1Node[] = []
        let hasExt = false
        if (this.pickNextChar() === '{') {
          this.skipWhitespace()
          this.checkComment()
          this.pos++
        }
        while (true) {
          this.skipWhitespace()
          if (this.source[this.pos] === '}') {
            this.pos++
            break
          }
          else if (this.source[this.pos] === ',') {
            this.pos++
          }
          const identifier = this.readIdentifier()
          let value: number

          if (identifier === '...') {
            hasExt = true
            continue
          }
          const command = this.readCommand()
          if (command) {
            value = +command
            index = value
          }
          else {
            value = index++
          }
          if (hasExt) {
            extItem.push({
              type: Asn1SyntaxType.EnumerationValue,
              value,
              variableName: identifier,
              deps: []
            })
          }
          else {
            standardItems.push({
              type: Asn1SyntaxType.EnumerationValue,
              value,
              variableName: identifier,
              deps: []
            })
          }
        }
        node.type = Asn1SyntaxType.Enumeration
        node.standardItems = standardItems
        node.extItems = extItem
        if (hasExt) {
          node.extendable = true
        }
        break
      }
      case 'REAL': {
        node.type = Asn1SyntaxType.Real
        const command = this.readCommand()
        if (command) {
          this.parseConstraint(node, `(${command})`)
        }
        break
      }
      case 'EXTERNAL': {
        node.type = Asn1SyntaxType.ExternalType
        this.readCommand()
        this.readArgument()
        break
      }
      case 'UTCTime': {
        node.type = Asn1SyntaxType.UniversalTime
      }
      case 'UniversalTime': {
        node.type = Asn1SyntaxType.GeneralisedTime
      }
      case 'EmbeddedPDV': {
        node.type = Asn1SyntaxType.EmbeddedPDV
        break
      }
      default: {
        node.type = 'identifier'
        node.referenceName = type.trim()
        if (this.deps.indexOf(node.referenceName) === -1) {
          this.deps.push(node.referenceName)
        }
        this.parseCommand(node)
        const argument = this.readArgument()
        if (argument) {
          node.arguments = argument.split(',').map((s) => s.trim())
        }
        break
      }
    }

    while (this.objectParsing) {
      const nextChar = this.pickNextChar()
      if (nextChar === ',' || nextChar === '}') {
        break
      }
      const next = this.readIdentifier()
      if (next === 'OPTIONAL') {
        node.optional = true
      }
      else if (next === 'DEFAULT') {
        let value: any = this.readIdentifier()
        if (value === 'FALSE') {
          value = false
        }
        else if (value === 'TRUE') {
          value = true
        }
        else if (node.type === Asn1SyntaxType.Integer) {
          value = +value
        }
      }
    }

    return node
  }

  private readImports() {
    const node: Asn1Node = {
      type: 'import',
      deps: [],
      imports: []
    }
    let names: string[] = []
    while (true) {
      const identifier = this.readIdentifier()
      if (identifier === 'FROM') {
        const path = this.readIdentifier()
        node.imports.push({
          names,
          path: path
        })
        names = []
        this.skipWhitespace()
        if (this.source[this.pos] === ';') {
          this.pos++
          break
        }
      }
      else {
        this.readArgument()
        names.push(identifier)
        this.skipWhitespace()
        if (this.source[this.pos] === ',') {
          this.pos++
        }
      }
    }
    return node
  }

  private skipWhitespace() {
    while (this.pos < this.source.length && /\s/.test(this.source[this.pos])) {
      this.pos++
    }
  }

  private skipComment() {
    while (true) {
      if (this.pos >= this.source.length
        || /(\r|\n)/.test(this.source[this.pos])
        || (this.source[this.pos] === '-'
          && (this.pos + 1) < this.source.length
          && this.source[this.pos + 1] === '-'
        )
      ) {
        if (this.source[this.pos] === '-') {
          this.pos += 2
        }
        this.skipWhitespace()
        break
      }
      this.pos++
    }
  }

  private checkComment() {
    while (this.source[this.pos] === '-'
      && (this.pos + 1) < this.source.length
      && this.source[this.pos + 1] === '-'
    ) {
      this.pos += 2
      this.skipComment()
    }
  }

  private readIdentifier() {
    this.skipWhitespace()
    let identifier = ''
    while (this.pos < this.source.length
      && !/\s|\(|\)|,|;|\{|\}/.test(this.source[this.pos])
    ) {
      this.checkComment()
      if (this.source[this.pos] === ':'
        && identifier.length
        && identifier[identifier.length - 1] !== ':'
        || identifier === '::='
      ) {
        break
      }
      identifier += this.source[this.pos]
      this.pos++
    }
    return identifier
  }
}

let parser: Parser

export default function parse(source: string) {
  if (!parser) {
    parser = new Parser()
  }
  return parser.parse(source)
}
