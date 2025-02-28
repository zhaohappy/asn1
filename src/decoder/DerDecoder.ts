import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxAny, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxChoice, Asn1SyntaxConstrainedString, Asn1SyntaxEnumeration,
  Asn1SyntaxExternal, Asn1SyntaxInteger, Asn1SyntaxObjectId, Asn1SyntaxOctetString, Asn1SyntaxReal,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxSet, Asn1SyntaxSetOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String,
  ChoiceTag,
  ChoiceTagClass,
  ChoiceValue,
} from '../asn/defined'
import Reader from '../io/Reader'
import { TagClass, TagType, UniversalTags } from '../asn/def'
import decodeOid from '../function/decodeOid'
import decodeReal from '../function/decodeReal'
import getChoiceFromTag from '../function/getChoiceFromTag'

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER)

export default class DerDecoder {

  private reader: Reader

  private textDecoderMap: Map<string, TextDecoder>

  constructor() {
    this.reader = new Reader()
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
        len
      }
    }

    if (lenLen === 0x80) {
      throw new Error('der not support indefinite-length method')
    }

    lenLen &= 0x7f

    len = 0
    while (lenLen-- > 0) {
      len = (len << 8) | this.readByte()
    }
    return {
      tagClass,
      primitive,
      tag,
      len
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
    const { len } = this.readHeader()
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
    const { len } = this.readHeader()
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

  private decodeOctetString(syntax: Asn1SyntaxOctetString) {
    const { len } = this.readHeader()
    const buffer = this.reader.readBuffer(len)
    return buffer
  }

  private decodeConstrainedString(syntax: Asn1SyntaxConstrainedString) {
    const { len } = this.readHeader()
    let v = ''
    for (let i = 0; i < len; i++) {
      v += String.fromCharCode(this.readByte())
    }
    return v
  }

  private decodeBMPString(syntax: Asn1SyntaxBMPString) {
    const { len } = this.readHeader()
    const buffer = this.reader.readBuffer(len)
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
    const { key, choiceSyntax } = getChoiceFromTag(tag, tagClass, syntax)
    if (key) {
      if (choiceSyntax.tagType !== TagType.Explicitly) {
        this.reader.setPos(pos)
      }
      return {
        [key]: this.decodeInternal(tagClass === TagClass.ContextSpecific ? choiceSyntax.asn1Tag : tag, choiceSyntax)
      }
    }
    else {
      this.reader.setPos(pos)
      const value = this.decodeInternal(tag, {} as any)
      return {
        [ChoiceValue]: value,
        [ChoiceTag]: tag,
        [ChoiceTagClass]: tagClass
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
    const { len } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const result = {}
    const keys = syntax.keys.concat(syntax.extKeys)
    let i = 0
    while (this.reader.getPos() < endPos) {
      let now = this.reader.getPos()
      let { tag, tagClass } = this.readHeader()

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
              throw new Error(`cannot found key og tag ${tag}`)
            }
            key = keys[i]
          }
          else {
            throw new Error(`cannot found key og tag ${tag}`)
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

    // 处理默认值
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
    const { len } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const result = {}
    while (this.reader.getPos() < endPos) {
      let now = this.reader.getPos()
      let { tag, tagClass } = this.readHeader()

      let key = this.getKeyByTag(tag, tagClass, syntax)
      if (!key) {
        throw new Error(`cannot found key of tag ${tag}`)
      }

      const keySyntax = syntax.standardItems[key] || syntax.extItems[key]
      if (keySyntax.tagType !== TagType.Explicitly) {
        this.reader.setPos(now)
      }
      result[key] = this.decodeInternal(tagClass === TagClass.ContextSpecific ? keySyntax.asn1Tag : tag, keySyntax)
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
    const { len } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const list = []
    while (this.reader.getPos() < endPos) {
      const tag = this.peekTag()
      list.push(this.decodeInternal(tag, syntax.syntax))
    }
    return list
  }

  private decodeSetOf(syntax: Asn1SyntaxSetOf) {
    const { len } = this.readHeader()
    const endPos = this.reader.getPos() + len
    const list = []
    while (this.reader.getPos() < endPos) {
      const tag = this.peekTag()
      list.push(this.decodeInternal(tag, syntax.syntax))
    }
    return list
  }

  private decodeUTF8String(syntax: Asn1SyntaxUTF8String) {
    const { len } = this.readHeader()
    if (!len) {
      return ''
    }
    const buffer = this.reader.readBuffer(len)

    let decoder = this.textDecoderMap.get('utf-8')
    if (!decoder) {
      decoder = new TextDecoder()
      this.textDecoderMap.set('utf-8', decoder)
    }
    return decoder.decode(buffer)
  }

  protected decodeAny(syntax: Asn1SyntaxAny) {
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
