import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxAny, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxChoice, Asn1SyntaxConstrainedString, Asn1SyntaxEnumeration,
  Asn1SyntaxExternal, Asn1SyntaxInteger, Asn1SyntaxObjectId, Asn1SyntaxOctetString, Asn1SyntaxReal,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxSet, Asn1SyntaxSetOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String,
  ChoiceTag,
  ChoiceValue,
} from '../asn/defined'
import Reader from '../io/Reader'
import { TagClass, TagType, UniversalTags } from '../asn/def'
import decodeOid from '../function/decodeOid'
import decodeReal from '../function/decodeReal'
import getChoiceFromTag from '../function/getChoiceFromTag'
import concatTypeArray from '../function/concatTypeArray'

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER)

export default class BerDecoder {

  private reader: Reader

  private textDecoderMap: Map<string, TextDecoder>

  public onFlush: (data: Uint8Array) => number

  constructor() {
    this.reader = new Reader()
    this.reader.onFlush = (data) => {
      if (!this.onFlush) {
        throw new Error('not set onFlush callback')
      }
      return this.onFlush(data)
    }
    this.textDecoderMap = new Map()
  }

  private readByte() {
    return this.reader.readByte()
  }

  private readBytes(n: number) {
    let v = 0
    for (let i = 0; i < n; i++) {
      v = (v << 8) | this.reader.readByte()
    }
    return v
  }

  private readHeader() {
    const ident = this.readByte()
    const tagClass = ident >>> 6
    const primitive = (ident & 0x20) === 0
    let tag = ident & 31
    if (tag === 31) {
      let b = 0
      tag = 0
      do {
        b = this.readByte()
        tag = (tag << 7) | (b & 0x7f)
      } while ((b & 0x80) !== 0)
    }
    let len = 0
    let lenLen = this.readByte()
    if ((lenLen & 0x80) == 0) {
      len = lenLen
      return {
        tagClass,
        primitive,
        tag,
        len,
        indefiniteLength: false
      }
    }
    lenLen &= 0x7f
    let indefiniteLength = lenLen === 0x80

    len = 0
    while (lenLen-- > 0) {
      len = (len << 8) | this.readByte()
    }
    return {
      tagClass,
      primitive,
      tag,
      len,
      indefiniteLength
    }
  }

  private peekTag() {
    const ident = this.reader.peekByte()
    return ident & 31
  }

  private decodeNull() {
    this.readHeader()
    return null
  }

  private decodeBool() {
    this.readHeader()
    return this.readByte() ? true : false
  }

  private decodeInteger(syntax: Asn1SyntaxInteger) {
    let { len } = this.readHeader()
    if (len > 4) {
      let v = 0n
      let count = len
      while (count--) {
        v = (v << 8n) | BigInt(this.readByte())
      }
      v = BigInt.asIntN(len * 8, v)
      if (v <= MAX_SAFE_INTEGER && v >= MIN_SAFE_INTEGER) {
        return Number(v)
      }
      return v
    }
    else {
      const v = this.readBytes(len)
      return v << (32 - len * 8) >> (32 - len * 8)
    }
  }

  private decodeEnumeration(syntax: Asn1SyntaxEnumeration) {
    return this.decodeInteger(syntax as any)
  }

  private decodeReal(syntax: Asn1SyntaxReal) {
    const { len } = this.readHeader()
    if (!len) {
      return 0.0
    }
    const buffer = this.reader.readBuffer(len)
    return decodeReal(buffer)
  }

  private decodeOid(syntax: Asn1SyntaxObjectId) {
    const { len } = this.readHeader()
    const buffer = this.reader.readBuffer(len)
    return decodeOid(buffer)
  }

  private decodeBitString(syntax: Asn1SyntaxBitString) {
    const { len, primitive, indefiniteLength } = this.readHeader()
    if (primitive) {
      const rest = this.readByte()
      let v = ''
      for (let i = 0; i < ((len - 1) * 8 - rest); i++) {
        v += this.reader.readU1()
      }
      for (let i = 0; i < rest; i++) {
        this.reader.readU1()
      }
      return v
    }
    else {
      let v = ''
      if (indefiniteLength) {
        while (true) {
          const { len, tag, tagClass } = this.readHeader()
          if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
            break
          }
          const rest = this.readByte()
          for (let i = 0; i < ((len - 1) * 8 - rest); i++) {
            v += this.reader.readU1()
          }
          for (let i = 0; i < rest; i++) {
            this.reader.readU1()
          }
        }
      }
      else {
        throw new Error('invalid data')
      }
    }
  }

  private decodeOctetString(syntax: Asn1SyntaxOctetString) {
    const { len, primitive, indefiniteLength } = this.readHeader()
    if (primitive) {
      const buffer = this.reader.readBuffer(len)
      return buffer
    }
    else {
      const buffers: Uint8Array[] = []
      if (indefiniteLength) {
        while (true) {
          const { len, tag, tagClass } = this.readHeader()
          if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
            break
          }
          buffers.push(this.reader.readBuffer(len))
        }
        return concatTypeArray(Uint8Array, buffers)
      }
      else {
        throw new Error('invalid data')
      }
    }
  }

  private decodeConstrainedString(syntax: Asn1SyntaxConstrainedString) {
    const { len, primitive, indefiniteLength } = this.readHeader()
    if (primitive) {
      let v = ''
      for (let i = 0; i < len; i++) {
        v += String.fromCharCode(this.readByte())
      }
      return v
    }
    else {
      let v = ''
      if (indefiniteLength) {
        while (true) {
          const { len, tag, tagClass } = this.readHeader()
          if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
            break
          }
          for (let i = 0; i < len; i++) {
            v += String.fromCharCode(this.readByte())
          }
        }
      }
      else {
        throw new Error('invalid data')
      }
    }
  }

  private decodeBMPString(syntax: Asn1SyntaxBMPString) {
    const { len, primitive, indefiniteLength } = this.readHeader()

    let buffer: Uint8Array
    if (primitive) {
      buffer = this.reader.readBuffer(len)
    }
    else {
      const buffers: Uint8Array[] = []
      if (indefiniteLength) {
        while (true) {
          const { len, tag, tagClass } = this.readHeader()
          if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
            break
          }
          buffers.push(this.reader.readBuffer(len))
        }
        buffer = concatTypeArray(Uint8Array, buffers)
      }
      else {
        throw new Error('invalid data')
      }
    }
    let v = ''
    for (let i = 0; i < buffer.length;) {
      v += String.fromCharCode((buffer[i] << 8) | (buffer[i + 1] || 0))
      i += 2
    }
    return v
  }

  private decodeChoice(syntax: Asn1SyntaxChoice) {
    let pos = this.reader.getPos()
    let { tag, tagClass } = this.readHeader()

    if (syntax) {
      this.reader.setPos(pos)
    }

    const { key, choiceSyntax } = getChoiceFromTag(tag, tagClass, syntax)
    if (key) {
      return {
        [key]: this.decodeInternal(tagClass === TagClass.ContextSpecific ? choiceSyntax.asn1Tag : tag, choiceSyntax)
      }
    }
    else {
      const value = this.decodeInternal(tag, {} as any)
      return {
        [ChoiceValue]: value,
        [ChoiceTag]: tag
      }
    }
  }

  private getKeyByTag(tag: number, tagClass: number, syntax: Asn1SyntaxSequence | Asn1SyntaxSet) {
    let keys = syntax.keys
    for (let i = 0; i < keys.length; i++) {
      if (syntax.standardItems[keys[i]].tagClass === tagClass) {
        if (syntax.standardItems[keys[i]].tag === tag) {
          return keys[i]
        }
      }
    }

    if (syntax.extendable) {
      let extKeys = syntax.extKeys
      for (let i = 0; i < extKeys.length; i++) {
        if (syntax.extItems[extKeys[i]].tagClass === tagClass) {
          if (syntax.extItems[extKeys[i]].tag === tag) {
            return extKeys[i]
          }
        }
      }
    }
  }

  private decodeSequence(syntax: Asn1SyntaxSequence) {
    const { len, indefiniteLength } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const result = {}
    const keys = syntax.keys.concat(syntax.extKeys)
    let i = 0
    while (indefiniteLength || this.reader.getPos() < endPos) {
      let now = this.reader.getPos()
      let { tag, tagClass, len } = this.readHeader()

      if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
        if (indefiniteLength) {
          break
        }
        else {
          this.reader.skip(len)
        }
      }

      let key: string = ''
      if (tagClass === TagClass.ContextSpecific) {
        key = this.getKeyByTag(tag, tagClass, syntax)
        if (!key) {
          while (true) {
            const currentSyntax =  syntax.standardItems[keys[i]] || syntax.extItems[keys[i]]
            if (currentSyntax.optional) {
              i++
            }
            else {
              break
            }
          }
          const currentSyntax =  syntax.standardItems[keys[i]] || syntax.extItems[keys[i]]
          if (currentSyntax && currentSyntax.type === Asn1SyntaxType.Choice) {
            const { choiceSyntax } = getChoiceFromTag(tag, tagClass, currentSyntax as Asn1SyntaxChoice)
            if (!choiceSyntax) {
              throw new Error(`cannot found key of tag ${tag}`)
            }
            key = keys[i]
          }
          else {
            throw new Error(`cannot found key of tag ${tag}`)
          }
        }
        else {
          while (keys[i] !== key) {
            i++
          }
        }
      }
      else {
        while (i < keys.length - 1) {
          const currentSyntax =  syntax.standardItems[keys[i]] || syntax.extItems[keys[i]]
          if (currentSyntax.optional) {
            i++
          }
          else {
            break
          }
        }
        key = keys[i]
      }

      const keySyntax = syntax.standardItems[key] || syntax.extItems[key]

      if (keySyntax.tagType !== TagType.Explicitly) {
        this.reader.setPos(now)
      }
      result[key] = this.decodeInternal(tagClass === TagClass.ContextSpecific ? keySyntax.asn1Tag : tag, keySyntax)

      i++
    }
    for (let i = 0; i < keys.length; i++) {
      const keySyntax = syntax.standardItems[keys[i]] || syntax.extItems[keys[i]]
      if (keySyntax.optional
        && keySyntax.defaultValue !== undefined
        && result[keys[i]] === undefined
      ) {
        result[keys[i]] = keySyntax.defaultValue
      }
    }
    return result
  }

  private decodeSet(syntax: Asn1SyntaxSet) {
    const { len, indefiniteLength } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const result = {}
    while (indefiniteLength || this.reader.getPos() < endPos) {
      let now = this.reader.getPos()
      let { tag, tagClass, len } = this.readHeader()

      if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
        if (indefiniteLength) {
          break
        }
        else {
          this.reader.skip(len)
        }
      }
      let key = this.getKeyByTag(tag, tagClass, syntax)
      if (!key) {
        throw new Error(`cannot found key og tag ${tag}`)
      }
      const keySyntax = syntax.standardItems[key] || syntax.extItems[key]
      if (keySyntax.tagType !== TagType.Explicitly) {
        this.reader.setPos(now)
      }
      result[key] = this.decodeInternal(keySyntax.asn1Tag, keySyntax)
    }
    // 处理默认值
    const keys = syntax.keys.concat(syntax.extKeys)
    for (let i = 0; i < keys.length; i++) {
      const keySyntax = syntax.standardItems[keys[i]] || syntax.extItems[keys[i]]
      if (keySyntax.optional
        && keySyntax.defaultValue !== undefined
        && result[keys[i]] === undefined
      ) {
        result[keys[i]] = keySyntax.defaultValue
      }
    }
    return result
  }

  private decodeSequenceOf(syntax: Asn1SyntaxSequenceOf) {
    const { len, indefiniteLength } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const list = []
    while (indefiniteLength || this.reader.getPos() < endPos) {
      const nextTag = this.peekTag()
      list.push(this.decodeInternal(nextTag, syntax.syntax))
      let now = this.reader.getPos()
      let { tag, tagClass } = this.readHeader()
      if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
        break
      }
      else {
        this.reader.setPos(now)
      }
    }
    return list
  }

  private decodeSetOf(syntax: Asn1SyntaxSetOf) {
    const { len, indefiniteLength } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const list = []
    while (indefiniteLength || this.reader.getPos() < endPos) {
      const nextTag = this.peekTag()
      list.push(this.decodeInternal(nextTag, syntax.syntax))
      let now = this.reader.getPos()
      let { tag, tagClass } = this.readHeader()
      if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
        break
      }
      else {
        this.reader.setPos(now)
      }
    }
    return list
  }

  private decodeUTF8String(syntax: Asn1SyntaxUTF8String) {
    const { len, primitive, indefiniteLength } = this.readHeader()
    let buffer: Uint8Array
    if (primitive) {
      if (!len) {
        return ''
      }
      buffer = this.reader.readBuffer(len)
    }
    else {
      const buffers: Uint8Array[] = []
      if (indefiniteLength) {
        while (true) {
          const { len, tag, tagClass } = this.readHeader()
          if (tagClass === TagClass.Universal && tag === UniversalTags.Invalid) {
            break
          }
          buffers.push(this.reader.readBuffer(len))
        }
        buffer = concatTypeArray(Uint8Array, buffers)
      }
      else {
        throw new Error('invalid data')
      }
    }

    let decoder = this.textDecoderMap.get('utf-8')
    if (!decoder) {
      decoder = new TextDecoder()
      this.textDecoderMap.set('utf-8', decoder)
    }
    return decoder.decode(buffer)
  }

  private decodeAny(syntax: Asn1SyntaxAny) {
    const { len } = this.readHeader()
    if (!len) {
      return null
    }
    return this.reader.readBuffer(len)
  }

  private decodeInternal<T extends Asn1Syntax>(tag: number, syntax: T): Asn1Syntax2Value<T> {

    switch (syntax.type) {
      case Asn1SyntaxType.Choice:
        return this.decodeChoice(syntax as unknown as Asn1SyntaxChoice) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.SequenceOf:
        return this.decodeSequenceOf(syntax as unknown as Asn1SyntaxSequenceOf) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.SetOf:
        return this.decodeSetOf(syntax as unknown as Asn1SyntaxSetOf) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.ExternalType:
        return this.decodeSequence((syntax as unknown as Asn1SyntaxExternal).sequence) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Any:
        if (tag === UniversalTags.Sequence
          || tag === UniversalTags.Set
          || tag === UniversalTags.EmbeddedPDV
          || tag === UniversalTags.ExternalType
        ) {
          return this.decodeAny((syntax as unknown as Asn1SyntaxAny)) as Asn1Syntax2Value<T>
        }
    }

    switch (tag) {
      case UniversalTags.Null:
        return this.decodeNull()
      case UniversalTags.Boolean:
        return this.decodeBool() as Asn1Syntax2Value<T>
      case UniversalTags.Integer:
        return this.decodeInteger(syntax as unknown as Asn1SyntaxInteger) as Asn1Syntax2Value<T>
      case UniversalTags.BitString:
        return this.decodeBitString(syntax as unknown as Asn1SyntaxBitString) as Asn1Syntax2Value<T>
      case UniversalTags.BMPString:
        return this.decodeBMPString(syntax as unknown as Asn1SyntaxBMPString) as Asn1Syntax2Value<T>
      case UniversalTags.Enumeration:
        return this.decodeEnumeration(syntax as unknown as Asn1SyntaxEnumeration) as Asn1Syntax2Value<T>
      case UniversalTags.GeneralString:
      case UniversalTags.IA5String:
      case UniversalTags.NumericString:
      case UniversalTags.VisibleString:
      case UniversalTags.PrintableString:
      case UniversalTags.UniversalTime:
      case UniversalTags.GeneralisedTime:
      case UniversalTags.ObjectDescriptor:
      case UniversalTags.GraphicString:
        return this.decodeConstrainedString(syntax as unknown as Asn1SyntaxConstrainedString) as Asn1Syntax2Value<T>
      case UniversalTags.OctetString:
      case UniversalTags.EmbeddedPDV:
        return this.decodeOctetString(syntax as unknown as Asn1SyntaxOctetString) as Asn1Syntax2Value<T>
      case UniversalTags.ObjectId:
        return this.decodeOid(syntax as unknown as Asn1SyntaxObjectId) as Asn1Syntax2Value<T>
      case UniversalTags.Sequence:
        return this.decodeSequence(syntax as unknown as Asn1SyntaxSequence) as Asn1Syntax2Value<T>
      case UniversalTags.Set:
        return this.decodeSet(syntax as unknown as Asn1SyntaxSet) as Asn1Syntax2Value<T>
      case UniversalTags.Real:
        return this.decodeReal(syntax as unknown as Asn1SyntaxReal) as Asn1Syntax2Value<T>
      case UniversalTags.ExternalType:
        return this.decodeSequence((syntax as unknown as Asn1SyntaxExternal).sequence) as Asn1Syntax2Value<T>
      case UniversalTags.UTF8String:
        return this.decodeUTF8String(syntax as unknown as Asn1SyntaxUTF8String) as Asn1Syntax2Value<T>
      case UniversalTags.Private: {
        const pos = this.reader.getPos()
        const { len } = this.readHeader()
        const skip = this.reader.getPos() - pos
        this.reader.setPos(pos)
        return this.reader.readBuffer(len + skip) as Asn1Syntax2Value<T>
      }
      case UniversalTags.VideotexString:
      case UniversalTags.UniversalString:
      case UniversalTags.TeletexString:
        throw new Error('not support')
      default:
        throw new Error('invalid syntax')
    }
  }

  public decode<T extends Asn1Syntax>(data: Uint8Array, syntax: T): Asn1Syntax2Value<T> {
    this.reader.resetBuffer(data)
    return this.decodeInternal(this.peekTag(), syntax)
  }
}
