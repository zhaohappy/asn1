import concatTypeArray from '../function/concatTypeArray'
import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxAny, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxChoice, Asn1SyntaxConstrained, Asn1SyntaxConstrainedString, Asn1SyntaxEnumeration,
  Asn1SyntaxExternal, Asn1SyntaxInteger, Asn1SyntaxObjectId, Asn1SyntaxOctetString, Asn1SyntaxReal,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String
} from '../asn/defined'
import Writer from '../io/Writer'
import { ConstraintType, Data } from '../asn/def'
import { INT32_MAX, INT32_MIN } from '../asn/constant'
import countBits from '../function/countBits'
import encodeOid from '../function/encodeOid'
import getChoice from '../function/getChoice'
import getSequenceMarker from '../function/getSequenceMarker'
import encodeReal from '../function/encodeReal'

export default class PerEncoder {

  private writer: Writer

  private subWriter: Writer

  private buffers: Uint8Array[]
  private subBuffers: Uint8Array[]

  private align: boolean
  private textEncoder: TextEncoder

  constructor(align: boolean = true) {
    this.writer = new Writer()
    this.subWriter = new Writer()
    this.buffers = []
    this.subBuffers = []
    this.align = align
    this.textEncoder = new TextEncoder()

    this.writer.onFlush = (data) => {
      this.buffers.push(data)
      return 0
    }
    this.subWriter.onFlush = (data) => {
      this.subBuffers.push(data)
      return 0
    }
  }

  private writeN(v: number, n: number) {
    if (n === 0) {
      return
    }
    if (n < 32) {
      v &= ((1 << n) - 1)
    }
    this.writer.writeU(n, v)
  }

  private writeNBigInt(v: bigint, n: number) {
    if (n === 0) {
      return
    }
    for (let i = 0; i < n; i++) {
      this.writer.writeU1(Number(v >> BigInt(n - i - 1) & 0x01n))
    }
  }

  // X.691 section 10.5
  private writeUnsigned(value: number, lower: number, upper: number) {
    // 10.5.4
    if (lower === upper) {
      return
    }
    let range = (upper - lower) + 1
    let  nBits = countBits(range)
    if (value < lower) {
      value = 0
    }
    else {
      value -= lower
    }
    // not 10.5.6 and not 10.5.7.1
    if (this.align && (range == 0 || range > 255)) {
      // not 10.5.7.4
      if (nBits > 16) {
        let numBytes = value == 0 ? 1 : (Math.floor(((countBits(value + 1)) + 7) / 8))
        // 12.2.6
        this.writeLength(numBytes, 1, Math.floor((nBits + 7) / 8))
        nBits = numBytes * 8
      }
      // not 10.5.7.2
      else if (nBits > 8) {
        // 10.5.7.3
        nBits = 16
      }
      // 10.7.5.2 - 10.7.5.4
      this.writer.padding()
    }
    this.writeN(value, nBits)
  }

  private writeSmallUnsigned(value: number) {
    if (value < 64) {
      this.writeN(value, 7)
      return
    }
    // 10.6.2
    this.writer.writeU1(1)

    let len = 4
    if (value < 256) {
      len = 1
    }
    else if (value < 65536) {
      len = 2
    }
    else if (value < 0x1000000) {
      len = 3
    }
    // 10.9
    this.writeLength(len, 0, INT32_MAX)
    this.writer.padding()
    this.writeN(value, len * 8)
  }

  private writeLength(length: number, lower: number, upper: number) {
    if (upper !== INT32_MAX && !this.align) {
      if (upper - lower < 0x10000) {
        throw new Error('10.9.4.2 unsupperted')
      }
      this.writeN(length - lower, countBits(upper - lower + 1))
      return
    }
    //  10.9.3.3
    if (upper < 65536) {
      this.writeUnsigned(length, lower, upper)
      return
    }
    this.writer.padding()

    if (length < 128) {
      // 10.9.3.6
      this.writeN(length, 8)
      return
    }

    this.writer.writeU1(1)

    if (length < 0x4000) {
      // 10.9.3.7
      this.writeN(length, 15)
      return
    }
    throw new Error('10.9.3.8 unsupported')
  }

  private encodeNull() {

  }

  private encodeConstrained(value: number | bigint, syntax: Asn1SyntaxConstrained) {
    if (!syntax.extendable) {
      return syntax.constraint !== ConstraintType.Fixed
    }

    let needsExtending = value > syntax.upperLimit
    if (!needsExtending) {
      if (value < syntax.lowerLimit) {
        needsExtending = true
      }
    }
    this.writer.writeU1(needsExtending ? 1 : 0)
    return needsExtending
  }

  private encodeConstrainedLength(length: number, syntax: Asn1SyntaxConstrained) {
    if (this.encodeConstrained(length, syntax)) {
      this.writeLength(length, 0, INT32_MAX)
    }
    else {
      this.writeLength(length, syntax.lowerLimit, syntax.upperLimit)
    }
  }

  private encodeBool(value: boolean) {
    this.writer.writeU1(value ? 1 : 0)
  }

  // X.691 Sections 12
  private encodeInteger(value: number | bigint, syntax: Asn1SyntaxInteger) {
    if (this.encodeConstrained(value, syntax)) {
      let numberOfBytes = 0
      let adjust = value
      if (value > 0) {
        const bit = value.toString(2)
        numberOfBytes = Math.floor((bit.length + 7) / 8)
        if ((bit.length % 8) === 0 && bit[0] === '1') {
          numberOfBytes++
        }
      }
      else if (value < 0) {
        if (value < INT32_MIN) {
          const bits = value.toString(2).length - 1
          numberOfBytes = Math.floor((bits + 7) / 8)
          adjust = BigInt.asUintN(numberOfBytes * 8, BigInt(value))
        }
        else {
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
          numberOfBytes = Math.floor((bit.length + 7) / 8)
        }
      }
      else {
        numberOfBytes = 1
      }
      this.writeLength(numberOfBytes, 0, INT32_MAX)
      if (numberOfBytes > 4) {
        this.writeNBigInt(BigInt(adjust), 8 * numberOfBytes)
      }
      else {
        this.writeN(Number(adjust), 8 * numberOfBytes)
      }
      return
    }
    // 12.2.1
    if (syntax.lowerLimit === syntax.upperLimit) {
      return
    }
    if (value < syntax.lowerLimit || value > syntax.upperLimit) {
      throw new Error('invalid value, out of limit')
    }
    this.writeUnsigned(Number(value), syntax.lowerLimit, syntax.upperLimit)
  }

  // X.691 Section 13
  private encodeEnumeration(value: number, syntax: Asn1SyntaxEnumeration) {
    if (syntax.extendable) {
      const extended = value > syntax.maxEnumValue
      this.writer.writeU1(extended ? 1 : 0)
      if (extended) {
        this.writeSmallUnsigned(value + 1)
        this.writeUnsigned(value, 0, value)
        return
      }
    }
    this.writeUnsigned(value, 0, syntax.maxEnumValue)
  }

  private encodeReal(value: number, syntax: Asn1SyntaxReal) {
    const encoded = encodeReal(value)
    this.writeLength(encoded.length, 0, INT32_MAX)
    this.writer.writeBuffer(encoded)
  }

  private encodeOid(value: string, syntax: Asn1SyntaxObjectId) {
    const data = encodeOid(value)
    this.writeLength(data.length, 0, 255)
    this.writer.writeBuffer(data)
  }

  private encodeBitString(value: string, syntax: Asn1SyntaxBitString) {
    this.encodeConstrainedLength(value.length, syntax)
    if (!value.length) {
      return
    }
    // 15.9
    if (value.length > 16) {
      this.writer.padding()
    }
    for (let i = 0; i < value.length; i++) {
      this.writer.writeU1(+value[i])
    }
  }

  private encodeOctetString(value: Uint8Array, syntax: Asn1SyntaxOctetString) {
    this.encodeConstrainedLength(value.length, syntax)
    if (syntax.lowerLimit !== syntax.upperLimit) {
      this.writer.writeBuffer(value)
      return
    }
    switch (value.length) {
      // 16.5
      case 0:
        break
      // 16.6
      case 1:
        this.writeN(value[0], 8)
        break
      // 16.6
      case 2:
        this.writeN(value[0], 8)
        this.writeN(value[1], 8)
        break
      // 16.7
      default:
        this.writer.writeBuffer(value)
    }
  }

  private encodeConstrainedString(value: string, syntax: Asn1SyntaxConstrainedString) {
    let len = value.length
    this.encodeConstrainedLength(len, syntax)
    if (len === 0) {
      // 10.9.3.3
      return
    }
    const nBits = this.align ? syntax.charSetAlignedBits : syntax.charSetUnalignedBits
    const totalBits = syntax.upperLimit * nBits
    if (syntax.constraint == ConstraintType.Unconstrained
      || (syntax.lowerLimit == syntax.upperLimit ? (totalBits > 16) : (totalBits >= 16))
    ) {
      // 26.5.7
      if (nBits == 8) {
        this.writer.padding()
        for (let i = 0; i < value.length; i++) {
          const code = value.charCodeAt(i)
          this.writeN(code, nBits)
        }
        return
      }
      if (this.align) {
        this.writer.padding()
      }
    }
    for (let i = 0; i < value.length; i++) {
      if (nBits >= syntax.canonicalSetBits && syntax.canonicalSetBits > 4) {
        this.writeN(value.charCodeAt(i), nBits)
      }
      else {
        let pos = syntax.canonicalSet.indexOf(value[i])
        if (pos < 0) {
          pos = 0
        }
        this.writeN(pos, nBits)
      }
    }
  }

  private encodeBMPString(value: string, syntax: Asn1SyntaxBMPString) {
    let len = value.length
    this.encodeConstrainedLength(len, syntax)
    if (len === 0) {
      return
    }
    let nBits = this.align ? syntax.charSetAlignedBits : syntax.charSetUnalignedBits

    if ((syntax.constraint == ConstraintType.Unconstrained || syntax.upperLimit * nBits > 16) && this.align) {
      this.writer.padding()
    }
    for (let i = 0; i < len; i++) {
      if (!syntax.charSet) {
        this.writeN(value.charCodeAt(i) - syntax.firstChar, nBits)
      }
      else {
        for (let pos = 0; pos < syntax.charSet.length; pos++) {
          if (syntax.charSet.charCodeAt(pos) == value.charCodeAt(i)) {
            this.writeN(pos, nBits)
            break
          }
        }
      }
    }
  }

  private encodeChoice(choice: Data, syntax: Asn1SyntaxChoice) {
    const { index, value, choiceSyntax } = getChoice(choice, syntax)
    if (!value || index < 0 || !choiceSyntax) {
      throw new Error('invalid choice')
    }

    if (syntax.extendable) {
      let extended = index >= syntax.numChoices
      this.writer.writeU1(extended ? 1 : 0)
      if (extended) {
        this.writeSmallUnsigned(index - syntax.numChoices)
        this.encodeAnyType(value, choiceSyntax)
        return
      }
    }
    if (syntax.numChoices > 1) {
      this.writeUnsigned(index, 0, syntax.numChoices - 1)
    }
    this.encodeInternal(value, choiceSyntax as Asn1SyntaxInteger)
  }

  private encodeSequence(sequence: Data, syntax: Asn1SyntaxSequence) {
    const { optionalMarker, extendMarker } = getSequenceMarker(sequence, syntax)
    if (syntax.extendable) {
      this.writer.writeU1(extendMarker ? 1 : 0)
    }
    if (optionalMarker.length > 65536) {
      this.writeLength(optionalMarker.length, 0, INT32_MAX)
    }
    for (let i = 0; i < optionalMarker.length; i++) {
      this.writer.writeU1(+optionalMarker[i])
    }
    if (syntax.extendable && extendMarker) {
      this.writeSmallUnsigned(extendMarker.length - 1)
      for (let i = 0; i < extendMarker.length; i++) {
        this.writer.writeU1(+extendMarker[i])
      }
    }

    let keys = syntax.keys
    for (let i = 0; i < keys.length; i++) {
      if (sequence[keys[i]] !== undefined || syntax.standardItems[keys[i]].defaultValue) {
        this.encodeInternal(sequence[keys[i]] ?? syntax.standardItems[keys[i]].defaultValue, syntax.standardItems[keys[i]] as Asn1SyntaxInteger)
      }
    }
    if (syntax.extendable && extendMarker) {
      let keys = syntax.extKeys
      for (let i = 0; i < keys.length; i++) {
        if (sequence[keys[i]] !== undefined || syntax.extItems[keys[i]].defaultValue) {
          this.encodeAnyType(sequence[keys[i]] ?? syntax.extItems[keys[i]].defaultValue, syntax.extItems[keys[i]])
        }
      }
    }
  }

  private encodeSequenceOf(list: Data[], syntax: Asn1SyntaxSequenceOf) {
    this.encodeConstrainedLength(list.length, syntax)
    for (let i = 0; i < list.length; i++) {
      this.encodeInternal(list[i], syntax.syntax as Asn1SyntaxAny)
    }
  }

  private encodeAnyType(value: any, syntax: Asn1Syntax) {
    this.subBuffers.length = 0
    this.subWriter.reset()
    let buffer: Uint8Array<ArrayBufferLike> = new Uint8Array([0])
    if (value != null) {
      const writer = this.writer
      this.writer = this.subWriter
      this.encodeInternal(value, syntax as Asn1SyntaxInteger)
      this.writer.flush()
      buffer = concatTypeArray(Uint8Array, this.subBuffers)
      this.writer = writer
    }
    this.writeLength(buffer.length, 0, INT32_MAX)
    this.writer.writeBuffer(buffer)
  }

  private encodeUTF8String(value: string, syntax: Asn1SyntaxUTF8String) {
    const buffer = this.textEncoder.encode(value)
    this.writeLength(buffer.length, 0, INT32_MAX)
    this.writer.writeBuffer(buffer)
  }

  private encodeInternal<T extends Asn1Syntax>(data: Asn1Syntax2Value<T>, syntax: T) {
    switch (syntax.type) {
      case Asn1SyntaxType.Null:
        this.encodeNull()
        break
      case Asn1SyntaxType.Boolean:
        this.encodeBool(data as boolean)
        break
      case Asn1SyntaxType.Integer:
        this.encodeInteger(data as number, syntax as unknown as Asn1SyntaxInteger)
        break
      case Asn1SyntaxType.BitString:
        this.encodeBitString(data as string, syntax as unknown as Asn1SyntaxBitString)
        break
      case Asn1SyntaxType.BMPString:
        this.encodeBMPString(data as string, syntax as unknown as Asn1SyntaxBMPString)
        break
      case Asn1SyntaxType.Choice:
        this.encodeChoice(data as Data, syntax as unknown as Asn1SyntaxChoice)
        break
      case Asn1SyntaxType.Enumeration:
        this.encodeEnumeration(data as number, syntax as unknown as Asn1SyntaxEnumeration)
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
        this.encodeConstrainedString(data as string, syntax as unknown as Asn1SyntaxConstrainedString)
        break
      case Asn1SyntaxType.OctetString:
      case Asn1SyntaxType.EmbeddedPDV:
        this.encodeOctetString(data as Uint8Array, syntax as unknown as Asn1SyntaxOctetString)
        break
      case Asn1SyntaxType.ObjectId:
        this.encodeOid(data as string, syntax as unknown as Asn1SyntaxObjectId)
        break
      case Asn1SyntaxType.Sequence:
      case Asn1SyntaxType.Set:
        this.encodeSequence(data as Data, syntax as unknown as Asn1SyntaxSequence)
        break
      case Asn1SyntaxType.SequenceOf:
      case Asn1SyntaxType.SetOf:
        this.encodeSequenceOf(data as Data[], syntax as unknown as Asn1SyntaxSequenceOf)
        break
      case Asn1SyntaxType.Real:
        this.encodeReal(data as number, syntax as unknown as Asn1SyntaxReal)
        break
      case Asn1SyntaxType.ExternalType:
        this.encodeSequence(data as Data, (syntax as unknown as Asn1SyntaxExternal).sequence)
        break
      case Asn1SyntaxType.UTF8String:
        this.encodeUTF8String(data as string, syntax as unknown as Asn1SyntaxUTF8String)
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
    this.encodeInternal(data, syntax)
    this.writer.padding()
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }
}
