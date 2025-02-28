import concatTypeArray from '../function/concatTypeArray'
import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxAny, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxBoolean,
  Asn1SyntaxChoice, Asn1SyntaxConstrainedString, Asn1SyntaxEnumeration,
  Asn1SyntaxExternal, Asn1SyntaxInteger, Asn1SyntaxNull, Asn1SyntaxObjectId, Asn1SyntaxOctetString, Asn1SyntaxReal,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxSet, Asn1SyntaxSetOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String
} from '../asn/defined'
import Writer from '../io/Writer'
import { Data, TagClass, TagType } from '../asn/def'
import { INT32_MIN, UINT32_MAX } from '../asn/constant'
import countBits from '../function/countBits'
import encodeOid from '../function/encodeOid'
import getChoice from '../function/getChoice'
import encodeReal from '../function/encodeReal'
import i64Toi32 from '../function/i64Toi32'

const supportBigInt = typeof BigInt === 'function'

export default class DerEncoder {

  protected writer: Writer

  protected subWriter: Writer

  protected buffers: Uint8Array[]
  protected subBuffers: Uint8Array[]

  protected textEncoder: TextEncoder

  constructor() {
    this.writer = new Writer()
    this.subWriter = new Writer()
    this.buffers = []
    this.subBuffers = []
    this.textEncoder = new TextEncoder()

    this.writer.onFlush = (data) => {
      this.buffers.push(data.slice())
      return 0
    }
    this.subWriter.onFlush = (data) => {
      this.subBuffers.push(data.slice())
      return 0
    }
  }

  protected isPrimitive(syntax: Asn1Syntax) {
    if (syntax.type === Asn1SyntaxType.Sequence
      || syntax.type === Asn1SyntaxType.Set
      || syntax.type === Asn1SyntaxType.SequenceOf
      || syntax.type === Asn1SyntaxType.SetOf
    ) {
      return false
    }
    return true
  }

  private writeHeader<T extends Asn1Syntax>(
    writer: Writer,
    syntax: T,
    tag: number,
    tagClass: number,
    length: number,
    isPrimitive: boolean = this.isPrimitive(syntax)
  ) {

    let ident = tagClass << 6

    if (!isPrimitive) {
      ident |= 0x20
    }

    if (tag < 31) {
      this.writeByte(writer, ident | tag)
    }
    else {
      this.writeByte(writer, ident | 31)
      let count = Math.floor((countBits(tag) + 6) / 7)
      while (count-- > 1) {
        this.writeByte(writer, (tag >> (count * 7)) & 0x7f)
      }
      this.writeByte(writer, tag & 0x7f)
    }
    if (length < 128) {
      this.writeByte(writer, length)
    }
    else {
      let count = Math.floor((countBits(length + 1) + 7) / 8)
      this.writeByte(writer, count | 0x80)
      while (count-- > 0) {
        this.writeByte(writer, length >> (count * 8))
      }
    }
  }

  protected writeElement<T extends Asn1Syntax>(writer: Writer, value: Asn1Syntax2Value<T>, syntax: T, data: (writer: Writer) => void) {
    this.subWriter.flush()
    const oldCache = this.subBuffers
    this.subBuffers = []
    data(this.subWriter)
    this.subWriter.flush()
    const buffer = concatTypeArray(Uint8Array, this.subBuffers)

    if (syntax.tagType === TagType.Explicitly) {
      this.subBuffers = []
      this.writeHeader(this.subWriter, syntax, syntax.asn1Tag, TagClass.Universal, buffer ? buffer.length : 0)
      this.subWriter.flush()
      const header = this.subBuffers[0]
      this.writeHeader(writer, syntax, syntax.tag, syntax.tagClass, (buffer ? buffer.length : 0) + header.length, false)
      writer.writeBuffer(header)
    }
    else {
      this.writeHeader(writer, syntax, syntax.tag, syntax.tagClass, buffer ? buffer.length : 0)
    }
    if (buffer) {
      writer.writeBuffer(buffer)
    }
    this.subBuffers = oldCache
  }

  protected writeByte(writer: Writer, v: number) {
    writer.writeByte(v)
  }

  private writeBytes(writer: Writer, v: number, n: number) {
    while (n--) {
      writer.writeByte((v >>> (n * 8)) & 0xff)
    }
  }

  private writeBytesBigInt(writer: Writer, v: bigint, n: number) {
    while (n--) {
      writer.writeByte(Number((v >> (BigInt(n) * 8n)) & 0xffn))
    }
  }

  private encodeNull(writer: Writer, syntax: Asn1SyntaxNull) {
    this.writeHeader(writer, syntax, syntax.tag, syntax.tagClass, 0)
  }

  private encodeBool(writer: Writer, value: boolean, syntax: Asn1SyntaxBoolean) {
    this.writeHeader(writer, syntax, syntax.tag, syntax.tagClass, 1)
    this.writeByte(writer, value ? 0xff : 0)
  }

  // X.691 Sections 12
  private encodeInteger(writer: Writer, value: number | bigint, syntax: Asn1SyntaxInteger) {
    this.writeElement(writer, value, syntax, (writer) => {
      if (value > 0) {
        const bit = value.toString(2)
        if ((bit.length % 8) === 0 && bit[0] === '1') {
          this.writeByte(writer, 0)
        }
        let len = Math.floor((bit.length + 7) / 8)
        if (value <= UINT32_MAX) {
          this.writeBytes(writer, Number(value), len)
        }
        else {
          this.writeBytesBigInt(writer, BigInt(value), len)
        }
      }
      else if (value < 0) {
        if (value < INT32_MIN) {
          const bits = value.toString(2).length - 1
          let len = Math.floor((bits + 7) / 8)
          this.writeBytesBigInt(writer, BigInt.asUintN(len * 8, BigInt(value)), len)
        }
        else {
          let adjust = 0
          if (value < -8388608) {
            adjust = Number(value) >>> 0
          }
          else if (value < -32768) {
            adjust = Number(value) & 0xffffff
          }
          else if (value < -128) {
            adjust = Number(value) & 0xffff
          }
          else {
            adjust = Number(value) & 0xff
          }
          const bit = adjust.toString(2)
          let len = Math.floor((bit.length + 7) / 8)
          this.writeBytes(writer, adjust, len)
        }
      }
      else {
        this.writeByte(writer, 0)
      }
    })
  }

  private encodeEnumeration(writer: Writer, value: number, syntax: Asn1SyntaxEnumeration) {
    this.writeElement(writer, value, syntax, (writer) => {
      if (value > 0) {
        const bit = value.toString(2)
        if (bit[0] === '1') {
          this.writeByte(writer, 0)
        }
        let len = Math.floor((bit.length + 7) / 8)
        this.writeBytes(writer, value, len)
      }
      else if (value < 0) {
        let adjust = value >>> 0
        const bit = adjust.toString(2)
        let len = Math.floor((bit.length + 7) / 8)
        this.writeBytes(writer, adjust, len)
      }
      else {
        this.writeByte(writer, 0)
      }
    })
  }

  private encodeReal(writer: Writer, value: number, syntax: Asn1SyntaxReal) {
    this.writeElement(writer, value, syntax, (writer) => {
      const encoded = encodeReal(value)
      writer.writeBuffer(encoded)
    })
  }

  private encodeOid(writer: Writer, value: string, syntax: Asn1SyntaxObjectId) {
    this.writeElement(writer, value, syntax, (writer) => {
      const data = encodeOid(value)
      writer.writeBuffer(data)
    })
  }

  private encodeChoice(writer: Writer, choice: Data, syntax: Asn1SyntaxChoice) {
    if (syntax.tagClass === TagClass.ContextSpecific) {
      this.writeElement(writer, choice as any, syntax, (writer) => {
        const { value, choiceSyntax } = getChoice(choice, syntax)
        this.encodeInternal(writer, value, choiceSyntax as Asn1SyntaxInteger)
      })
    }
    else {
      const { value, choiceSyntax } = getChoice(choice, syntax)
      this.encodeInternal(writer, value, choiceSyntax as Asn1SyntaxInteger)
    }
  }

  protected encodeBitString(writer: Writer, value: string, syntax: Asn1SyntaxBitString) {
    this.writeElement(writer, value, syntax, (writer) => {
      if (!value) {
        this.writeByte(writer, 0)
        return
      }
      const bits = Math.floor((value.length + 7) / 8) * 8
      const rest = bits - value.length
      this.writeByte(writer, rest)
      for (let i = 0; i < value.length; i++) {
        writer.writeU1(+value[i])
      }
      for (let i = 0; i < rest; i++) {
        writer.writeU1(0)
      }
    })
  }

  protected encodeOctetString(writer: Writer, value: Uint8Array, syntax: Asn1SyntaxOctetString) {
    this.writeElement(writer, value, syntax, (writer) => {
      writer.writeBuffer(value)
    })
  }

  protected encodeConstrainedString(writer: Writer, value: string, syntax: Asn1SyntaxConstrainedString) {
    this.writeElement(writer, value, syntax as unknown as Asn1SyntaxBMPString, (writer) => {
      const nBits = syntax.charSetAlignedBits
      for (let i = 0; i < value.length; i++) {
        if (nBits <= 8) {
          this.writeByte(writer, value.charCodeAt(i))
        }
        else {
          const code = value.charCodeAt(i)
          this.writeByte(writer, (code >>> 8) & 0xff)
          this.writeByte(writer, code & 0xff)
        }
      }
    })
  }

  protected encodeBMPString(writer: Writer, value: string, syntax: Asn1SyntaxBMPString) {
    this.writeElement(writer, value, syntax as unknown as Asn1SyntaxBMPString, (writer) => {
      for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i)
        this.writeByte(writer, (code >>> 8) & 0xff)
        this.writeByte(writer, code & 0xff)
      }
    })
  }

  protected encodeSequence(writer: Writer, sequence: Data, syntax: Asn1SyntaxSequence) {
    this.writeElement(writer, sequence as any, syntax, (writer) => {
      const keys = syntax.keys
      for (let i = 0; i < keys.length; i++) {
        if (sequence[keys[i]] !== undefined) {
          if (syntax.standardItems[keys[i]].optional
            && syntax.standardItems[keys[i]].defaultValue === sequence[keys[i]]
          ) {
            continue
          }
          this.encodeInternal(writer, sequence[keys[i]], syntax.standardItems[keys[i]] as Asn1SyntaxAny)
        }
      }
      const extKeys = syntax.extKeys
      for (let i = 0; i < extKeys.length; i++) {
        if (sequence[extKeys[i]] !== undefined) {
          if (syntax.extItems[extKeys[i]].optional
            && syntax.extItems[extKeys[i]].defaultValue === sequence[extKeys[i]]
          ) {
            continue
          }
          this.encodeInternal(writer, sequence[extKeys[i]], syntax.extItems[extKeys[i]] as Asn1SyntaxAny)
        }
      }
    })
  }

  protected encodeSet(writer: Writer, sequence: Data, syntax: Asn1SyntaxSet) {
    this.writeElement(writer, sequence as any, syntax, (writer) => {
      const keys = syntax.keys.sort((a, b) => {
        const sa = syntax.standardItems[a] || syntax.extItems[a]
        const sb = syntax.standardItems[b] || syntax.extItems[b]
        return sa.tag - sb.tag
      })
      for (let i = 0; i < keys.length; i++) {
        if (sequence[keys[i]] !== undefined) {
          if (syntax.standardItems[keys[i]].optional
            && syntax.standardItems[keys[i]].defaultValue === sequence[keys[i]]
          ) {
            continue
          }
          this.encodeInternal(writer, sequence[keys[i]], syntax.standardItems[keys[i]] as Asn1SyntaxAny)
        }
      }
      const extKeys = syntax.extKeys
      for (let i = 0; i < extKeys.length; i++) {
        if (sequence[extKeys[i]] !== undefined) {
          if (syntax.extItems[extKeys[i]].optional
            && syntax.extItems[extKeys[i]].defaultValue === sequence[extKeys[i]]
          ) {
            continue
          }
          this.encodeInternal(writer, sequence[extKeys[i]], syntax.extItems[extKeys[i]] as Asn1SyntaxAny)
        }
      }
    })
  }

  protected encodeSequenceOf(writer: Writer, list: Data[], syntax: Asn1SyntaxSequenceOf) {
    this.writeElement(writer, list as any, syntax as unknown as Asn1SyntaxSequenceOf, (writer) => {
      for (let i = 0; i < list.length; i++) {
        this.encodeInternal(writer, list[i], syntax.syntax as Asn1SyntaxAny)
      }
    })
  }

  protected encodeSetOf(writer: Writer, list: Data[], syntax: Asn1SyntaxSetOf) {
    this.writeElement(writer, list as any, syntax as unknown as Asn1SyntaxSequenceOf, (writer) => {
      this.writer.flush()
      const cache = this.buffers.slice()
      const buffers: Uint8Array[] = []
      for (let i = 0; i < list.length; i++) {
        buffers.push(this.encode(list[i], syntax.syntax as Asn1SyntaxAny))
      }
      buffers.sort((a, b) => {
        const len = Math.min(a.length, b.length)
        for (let i = 0; i < len; i++) {
          if (a[i] !== b[i]) {
            return a[i] - b[i]
          }
        }
        return a.length - b.length
      })
      writer.writeBuffer(concatTypeArray(Uint8Array, buffers))
      this.buffers = cache
    })
  }

  protected encodeUTF8String(writer: Writer, value: string, syntax: Asn1SyntaxUTF8String) {
    this.writeElement(writer, value, syntax as unknown as Asn1SyntaxBMPString, (writer) => {
      const buffer = this.textEncoder.encode(value)
      writer.writeBuffer(buffer)
    })
  }

  protected encodeAny(writer: Writer, value: Uint8Array, syntax: Asn1SyntaxAny) {
    writer.writeBuffer(value)
  }

  protected encodeInternal<T extends Asn1Syntax>(writer: Writer, data: Asn1Syntax2Value<T>, syntax: T) {
    switch (syntax.type) {
      case Asn1SyntaxType.Null:
        this.encodeNull(writer, syntax as unknown as Asn1SyntaxNull)
        break
      case Asn1SyntaxType.Boolean:
        this.encodeBool(writer, data as boolean, syntax as unknown as Asn1SyntaxBoolean)
        break
      case Asn1SyntaxType.Integer:
        this.encodeInteger(writer, data as number, syntax as unknown as Asn1SyntaxInteger)
        break
      case Asn1SyntaxType.BitString:
        this.encodeBitString(writer, data as string, syntax as unknown as Asn1SyntaxBitString)
        break
      case Asn1SyntaxType.BMPString:
        this.encodeBMPString(writer, data as string, syntax as unknown as Asn1SyntaxBMPString)
        break
      case Asn1SyntaxType.Choice:
        this.encodeChoice(writer, data as Data, syntax as unknown as Asn1SyntaxChoice)
        break
      case Asn1SyntaxType.Enumeration:
        this.encodeEnumeration(writer, data as number, syntax as unknown as Asn1SyntaxEnumeration)
        break
      case Asn1SyntaxType.GeneralString:
      case Asn1SyntaxType.IA5String:
      case Asn1SyntaxType.NumericString:
      case Asn1SyntaxType.VisibleString:
      case Asn1SyntaxType.PrintableString:
      case Asn1SyntaxType.UniversalTime:
      case Asn1SyntaxType.GeneralisedTime:
      case Asn1SyntaxType.ObjectDescriptor:
      case Asn1SyntaxType.GraphicString:
        this.encodeConstrainedString(writer, data as string, syntax as unknown as Asn1SyntaxConstrainedString)
        break
      case Asn1SyntaxType.OctetString:
      case Asn1SyntaxType.EmbeddedPDV:
        this.encodeOctetString(writer, data as Uint8Array, syntax as unknown as Asn1SyntaxOctetString)
        break
      case Asn1SyntaxType.ObjectId:
        this.encodeOid(writer, data as string, syntax as unknown as Asn1SyntaxObjectId)
        break
      case Asn1SyntaxType.Sequence:
        this.encodeSequence(writer, data as Data, syntax as unknown as Asn1SyntaxSequence)
        break
      case Asn1SyntaxType.Set:
        this.encodeSet(writer, data as Data, syntax as unknown as Asn1SyntaxSet)
        break
      case Asn1SyntaxType.SequenceOf:
        this.encodeSequenceOf(writer, data as Data[], syntax as unknown as Asn1SyntaxSequenceOf)
        break
      case Asn1SyntaxType.SetOf:
        this.encodeSetOf(writer, data as Data[], syntax as unknown as Asn1SyntaxSetOf)
        break
      case Asn1SyntaxType.Real:
        this.encodeReal(writer, data as number, syntax as unknown as Asn1SyntaxReal)
        break
      case Asn1SyntaxType.ExternalType:
        this.encodeSequence(writer, data as Data, (syntax as unknown as Asn1SyntaxExternal).sequence)
        break
      case Asn1SyntaxType.UTF8String:
        this.encodeUTF8String(writer, data as string, syntax as unknown as Asn1SyntaxUTF8String)
        break
      case Asn1SyntaxType.Any:
        this.encodeAny(writer, data as Uint8Array, syntax as unknown as Asn1SyntaxAny)
        break
      case Asn1SyntaxType.VideotexString:
      case Asn1SyntaxType.UniversalString:
      case Asn1SyntaxType.TeletexString:
        throw new Error('not support')
      case Asn1SyntaxType.BitStringIndex:
      case Asn1SyntaxType.BitStringWithIndex:
      case Asn1SyntaxType.EnumerationValue:
      case Asn1SyntaxType.Type:
        throw new Error('invalid syntax')
    }
  }

  public encode<T extends Asn1Syntax>(data: Asn1Syntax2Value<T>, syntax: T): Uint8Array {
    this.buffers.length = 0
    this.encodeInternal(this.writer, data, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }
}
