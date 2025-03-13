import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxChoice, Asn1SyntaxConstrained, Asn1SyntaxConstrainedString, Asn1SyntaxEnumeration,
  Asn1SyntaxExternal, Asn1SyntaxInteger, Asn1SyntaxObjectId, Asn1SyntaxOctetString, Asn1SyntaxReal,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String,
  ChoiceTag,
  ChoiceValue,
  SequenceExtendable
} from '../asn/defined'
import Reader from '../io/Reader'
import { ConstraintType, Data } from '../asn/def'
import { INT32_MAX } from '../asn/constant'
import countBits from '../function/countBits'
import decodeOid from '../function/decodeOid'
import decodeReal from '../function/decodeReal'
import getChoiceFromIndex from '../function/getChoiceFromIndex'

const MAX_SAFE_INTEGER = BigInt(Number.MAX_SAFE_INTEGER)
const MIN_SAFE_INTEGER = BigInt(Number.MIN_SAFE_INTEGER)

export default class PerDecoder {

  private reader: Reader
  private subReader: Reader

  private align: boolean
  private textDecoderMap: Map<string, TextDecoder>

  constructor(align: boolean = true) {
    this.reader = new Reader()
    this.subReader = new Reader()
    this.align = align
    this.textDecoderMap = new Map()
  }

  private readN(n: number) {
    if (n > 32) {
      throw new Error('invalid n bit')
    }
    if (n === 0) {
      return 0
    }
    return this.reader.readU(n)
  }

  // X.691 section 10.5
  private readUnsigned(lower: number, upper: number) {
    // 10.5.4
    if (lower === upper) {
      return lower
    }
    let range = (upper - lower) + 1
    let nBits = countBits(range)

    if (this.align && (range === 0 || range > 255)) {
      if (nBits > 16) {
        nBits = this.readLength(1, Math.floor((nBits + 7) / 8))
        nBits *= 8
      }
      else if (nBits > 8) {
        nBits = 16
      }
      this.reader.skipPadding()
    }
    let value = this.readN(nBits)

    value += lower

    // clamp value to upper limit
    if (value > upper) {
      value = upper
    }
    return value
  }
  // X.691 Section 10.6
  private readSmallUnsigned() {
    // 10.6.1
    if (!this.reader.readU1()) {
      return this.readN(6)
    }
    // 10.6.2
    let len = this.readLength(0, INT32_MAX)
    this.reader.skipPadding()
    return this.readN(len * 8)
  }

  // X.691 section 10.9
  private readLength(lower: number, upper: number) {
    let length = 0

    if (upper !== INT32_MAX && !this.align) {
      if (upper - lower > 0xffff) {
        throw new Error('not support')
      }
      let base = this.readN(countBits(upper - lower + 1))

      length = lower + base
      if (length > upper) {
        length = upper
      }
      return length
    }

    // 10.9.3.3
    if (upper < 65536) {
      return this.readUnsigned(lower, upper)
    }

    // 10.9.3.5
    this.reader.skipPadding()

    if (this.reader.readU1() == 0) {
      // 10.9.3.6
      length = this.readN(7)
    }
    else if (this.reader.readU1() == 0) {
      // 10.9.3.7
      length = this.readN(14)
    }
    // clamp value to upper limit
    if (length > upper) {
      length = upper
    }
    return length
  }

  private decodeNull() {
    return null
  }

  private decodeConstrainedLength(syntax: Asn1SyntaxConstrained) {
    if ((syntax.extendable && this.reader.readU1()) || syntax.constraint === ConstraintType.Unconstrained) {
      return this.readLength(0, INT32_MAX)
    }
    return this.readLength(syntax.lowerLimit, syntax.upperLimit)
  }

  private decodeBool() {
    return this.reader.readU1() === 1 ? true : false
  }

  // X.691 Sections 12
  private decodeInteger(syntax: Asn1SyntaxInteger) {
    switch (syntax.constraint) {
      // 12.2.1 & 12.2.2
      case ConstraintType.Fixed:
        break

      case ConstraintType.Extendable:
        //  12.1
        if (!this.reader.readU1()) {
          break
        }
      // 12.2.6
      default:
        let len = this.readLength(0, INT32_MAX)
        if (len > 4) {
          let v = 0n
          let count = len
          while (count--) {
            v = (v << 8n) | BigInt(this.readN(8))
          }
          v = BigInt.asIntN(len * 8, v)
          if (v <= MAX_SAFE_INTEGER && v >= MIN_SAFE_INTEGER) {
            return Number(v)
          }
          return v
        }
        else {
          const v = this.readN(len * 8)
          return v << (32 - len * 8) >> (32 - len * 8)
        }
    }
    // 12.2.2
    if (syntax.lowerLimit !== syntax.upperLimit) {
      return this.readUnsigned(syntax.lowerLimit, syntax.upperLimit)
    }
    // 12.2.1
    return syntax.lowerLimit
  }

  // X.691 Section 13
  private decodeEnumeration(syntax: Asn1SyntaxEnumeration) {
    // 13.3
    if (syntax.extendable) {
      if (this.reader.readU1()) {
        let len = this.readSmallUnsigned()
        return this.readUnsigned(0, len - 1)
      }
    }
    // 13.2
    return this.readUnsigned(0, syntax.maxEnumValue)
  }

  private decodeReal(syntax: Asn1SyntaxReal) {
    let length = this.readLength(0, INT32_MAX)
    if (!length) {
      return 0.0
    }
    const buffer = this.reader.readBuffer(length)
    return decodeReal(buffer)
  }

  private decodeOid(syntax: Asn1SyntaxObjectId) {
    let length = this.readLength(0, INT32_MAX)
    const buffer = this.reader.readBuffer(length)
    return decodeOid(buffer)
  }

  private decodeBitString(syntax: Asn1SyntaxBitString) {

    let length = this.decodeConstrainedLength(syntax)
    if (!length) {
      return ''
    }
    if (length > 16) {
      this.reader.skipPadding()
    }
    let v = ''
    for (let i = 0; i < length; i++) {
      v += this.reader.readU1()
    }
    return v
  }

  private decodeOctetString(syntax: Asn1SyntaxOctetString) {

    let length = this.decodeConstrainedLength(syntax)

    if (syntax.lowerLimit !== syntax.upperLimit) {
      return this.reader.readBuffer(length)
    }
    switch (length) {
      // 16.5
      case 0:
        break
      // 16.6
      case 1:
        return new Uint8Array([this.readN(8)])
      // 16.6
      case 2:
        return new Uint8Array([this.readN(8), this.readN(8)])
      // 16.7
      default:
        return this.reader.readBuffer(length)
    }
  }

  private decodeConstrainedString(syntax: Asn1SyntaxConstrainedString) {
    let length = this.decodeConstrainedLength(syntax)
    if (length === 0) {
      // 10.9.3.3
      return ''
    }
    let v = ''
    const nBits = this.align ? syntax.charSetAlignedBits : syntax.charSetUnalignedBits
    const totalBits = syntax.upperLimit * nBits
    if (syntax.constraint == ConstraintType.Unconstrained
      || (syntax.lowerLimit == syntax.upperLimit ? (totalBits > 16) : (totalBits >= 16))
    ) {
      // 26.5.7
      if (nBits == 8) {
        this.reader.skipPadding()
        for (let i = 0; i < length; i++) {
          v += String.fromCharCode(this.readN(nBits))
        }
        return v
      }
      if (this.align) {
        this.reader.skipPadding()
      }
    }
    for (let i = 0; i < length; i++) {
      if (nBits >= syntax.canonicalSetBits && syntax.canonicalSetBits > 4) {
        v += String.fromCharCode(this.readN(nBits))
      }
      else {
        v += syntax.canonicalSet[this.readN(nBits)]
      }
    }
    return v
  }

  private decodeBMPString(syntax: Asn1SyntaxBMPString) {
    let len = this.decodeConstrainedLength(syntax)
    if (len === 0) {
      return ''
    }
    let nBits = this.align ? syntax.charSetAlignedBits : syntax.charSetUnalignedBits

    if ((syntax.constraint == ConstraintType.Unconstrained || syntax.upperLimit * nBits > 16) && this.align) {
      this.reader.skipPadding()
    }
    let v = ''
    for (let i = 0; i < len; i++) {
      if (!syntax.charSet) {
        v += String.fromCharCode(this.readN(nBits) + syntax.firstChar)
      }
      else {
        v += syntax.charSet[this.readN(nBits)]
      }
    }
    return v
  }

  private decodeChoice(syntax: Asn1SyntaxChoice) {
    let v: Data = {}
    let tag = 0
    if (syntax.extendable) {
      if (this.reader.readU1()) {
        tag = this.readSmallUnsigned()
        tag += syntax.numChoices
        let len = this.readLength(0, INT32_MAX)
        const { key, choiceSyntax } = getChoiceFromIndex(tag, syntax)
        if (key) {
          v[key] = this.decodeAnyType(this.reader.readBuffer(len), choiceSyntax)
        }
        else {
          v[ChoiceTag] = tag
          v[ChoiceValue] = this.reader.readBuffer(len)
        }
        return v
      }
    }
    if (syntax.numChoices < 2) {
      tag = 0
    }
    else {
      tag = this.readUnsigned(0, syntax.numChoices - 1)
    }
    const { key, choiceSyntax } = getChoiceFromIndex(tag, syntax)
    if (key) {
      v[key] = this.decodeInternal(choiceSyntax)
      return v
    }
    else {
      throw new Error('invalid syntax')
    }
  }

  private decodeSequence(syntax: Asn1SyntaxSequence) {
    let hasExtend = false
    if (syntax.extendable) {
      hasExtend = this.reader.readU1() ? true : false
    }
    let optionalCount = syntax.optionalCount
    if (optionalCount > 65536) {
      optionalCount = this.readLength(0, INT32_MAX)
    }
    let optionalMarker: number[] = []
    let extendMarker: number[] = []
    for (let i = 0; i < optionalCount; i++) {
      optionalMarker.push(this.reader.readU1())
    }

    let sequence: Data = {}
    let keys = syntax.keys
    let optionalIndex = 0
    for (let i = 0; i < keys.length; i++) {
      if (!syntax.standardItems[keys[i]].optional || optionalMarker[optionalIndex++]) {
        sequence[keys[i]] = this.decodeInternal(syntax.standardItems[keys[i]])
      }
      else if (syntax.standardItems[keys[i]].defaultValue != null) {
        sequence[keys[i]] = syntax.standardItems[keys[i]].defaultValue
      }
    }
    if (syntax.extendable && hasExtend) {
      const len = this.readSmallUnsigned() + 1
      for (let i = 0; i < len; i++) {
        extendMarker.push(this.reader.readU1())
      }
      let keys = syntax.extKeys
      const others: Uint8Array[] = []
      for (let i = 0; i < extendMarker.length; i++) {
        if (extendMarker[i]) {
          let len = this.readLength(0, INT32_MAX)
          if (keys[i]) {
            sequence[keys[i]] = this.decodeAnyType(this.reader.readBuffer(len), syntax.extItems[keys[i]])
          }
          else {
            others.push(this.reader.readBuffer(len))
          }
        }
      }
      if (others.length) {
        sequence[SequenceExtendable] = others
      }
    }
    return sequence
  }

  private decodeSequenceOf(syntax: Asn1SyntaxSequenceOf) {
    const length = this.decodeConstrainedLength(syntax)
    const list = []
    for (let i = 0; i < length; i++) {
      list.push(this.decodeInternal(syntax.syntax))
    }
    return list
  }

  private decodeAnyType(buffer: Uint8Array, syntax: Asn1Syntax) {
    const reader = this.reader
    this.reader = this.subReader
    this.reader.resetBuffer(buffer)
    try {
      const v = this.decodeInternal(syntax)
      this.reader = reader
      return v
    }
    catch (error) {
      this.reader = reader
      throw error
    }
  }

  private decodeUTF8String(syntax: Asn1SyntaxUTF8String) {
    const length = this.readLength(0, INT32_MAX)
    if (!length) {
      return ''
    }
    const buffer = this.reader.readBuffer(length)
    let decoder = this.textDecoderMap.get('utf-8')
    if (!decoder) {
      decoder = new TextDecoder()
      this.textDecoderMap.set('utf-8', decoder)
    }
    return decoder.decode(buffer)
  }

  private decodeInternal<T extends Asn1Syntax>(syntax: T): Asn1Syntax2Value<T> {
    switch (syntax.type) {
      case Asn1SyntaxType.Null:
        return this.decodeNull()
      case Asn1SyntaxType.Boolean:
        return this.decodeBool() as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Integer:
        return this.decodeInteger(syntax as unknown as Asn1SyntaxInteger) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.BitString:
        return this.decodeBitString(syntax as unknown as Asn1SyntaxBitString) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.BMPString:
        return this.decodeBMPString(syntax as unknown as Asn1SyntaxBMPString) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Choice:
        return this.decodeChoice(syntax as unknown as Asn1SyntaxChoice) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Enumeration:
        return this.decodeEnumeration(syntax as unknown as Asn1SyntaxEnumeration) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.GeneralString:
      case Asn1SyntaxType.IA5String:
      case Asn1SyntaxType.NumericString:
      case Asn1SyntaxType.VisibleString:
      case Asn1SyntaxType.PrintableString:
      case Asn1SyntaxType.UniversalTime:
      case Asn1SyntaxType.GeneralisedTime:
      case Asn1SyntaxType.ObjectDescriptor:
      case Asn1SyntaxType.GraphicString:
        return this.decodeConstrainedString(syntax as unknown as Asn1SyntaxConstrainedString) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.OctetString:
      case Asn1SyntaxType.EmbeddedPDV:
        return this.decodeOctetString(syntax as unknown as Asn1SyntaxOctetString) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.ObjectId:
        return this.decodeOid(syntax as unknown as Asn1SyntaxObjectId) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Sequence:
      case Asn1SyntaxType.Set:
        return this.decodeSequence(syntax as unknown as Asn1SyntaxSequence) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.SequenceOf:
      case Asn1SyntaxType.SetOf:
        return this.decodeSequenceOf(syntax as unknown as Asn1SyntaxSequenceOf) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.Real:
        return this.decodeReal(syntax as unknown as Asn1SyntaxReal) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.ExternalType:
        return this.decodeSequence((syntax as unknown as Asn1SyntaxExternal).sequence) as Asn1Syntax2Value<T>
      case Asn1SyntaxType.UTF8String:
        return this.decodeUTF8String(syntax as unknown as Asn1SyntaxUTF8String) as Asn1Syntax2Value<T>
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

  public decode<T extends Asn1Syntax>(data: Uint8Array, syntax: T): Asn1Syntax2Value<T> {
    this.reader.resetBuffer(data)
    return this.decodeInternal(syntax)
  }
}
