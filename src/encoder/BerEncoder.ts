import DerEncoder from './DerEncoder'
import concatTypeArray from '../function/concatTypeArray'
import { Asn1Syntax, Asn1Syntax2Value, Asn1SyntaxAny, Asn1SyntaxBitString, Asn1SyntaxBMPString,
  Asn1SyntaxConstrainedString,
  Asn1SyntaxOctetString,
  Asn1SyntaxSequence, Asn1SyntaxSequenceOf, Asn1SyntaxSet, Asn1SyntaxSetOf, Asn1SyntaxType,
  Asn1SyntaxUTF8String
} from '../asn/defined'
import { Data } from '../asn/def'
import countBits from '../function/countBits'
import Writer from '../io/Writer'

export default class BerEncoder extends DerEncoder {

  private writeHeader2<T extends Asn1Syntax>(writer: Writer, syntax: T) {
    let ident = (syntax.tagClass << 6) | 0x20
    let tag = syntax.tag
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
    this.writeByte(writer, 0x80)
  }

  private writeElement2<T extends Asn1Syntax>(writer: Writer, syntax: T, data: (writer: Writer) => void) {
    this.subWriter.flush()
    const oldCache = this.subBuffers
    this.subBuffers = []
    data(this.subWriter)
    this.subWriter.flush()
    const buffer = concatTypeArray(Uint8Array, this.subBuffers)
    this.subBuffers = oldCache

    this.writeHeader2(writer, syntax)
    if (buffer) {
      writer.writeBuffer(buffer)
    }
  }

  protected encodeBitString(writer: Writer, value: string, syntax: Asn1SyntaxBitString, append?: boolean) {
    if (!append) {
      super.encodeBitString(writer, value, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeBitString(writer, value, syntax)
      })
    }
  }

  protected encodeOctetString(writer: Writer, value: Uint8Array, syntax: Asn1SyntaxOctetString, append?: boolean) {
    if (!append) {
      super.encodeOctetString(writer, value, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeOctetString(writer, value, syntax)
      })
    }
  }

  protected encodeConstrainedString(writer: Writer, value: string, syntax: Asn1SyntaxConstrainedString, append?: boolean) {
    if (!append) {
      super.encodeConstrainedString(writer, value, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeConstrainedString(writer, value, syntax)
      })
    }
  }

  protected encodeBMPString(writer: Writer, value: string, syntax: Asn1SyntaxBMPString, append?: boolean) {
    if (!append) {
      super.encodeBMPString(writer, value, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeBMPString(writer, value, syntax)
      })
    }
  }

  protected encodeSequenceInternal(writer: Writer, sequence: Data, syntax: Asn1SyntaxSequence) {
    this.writeElement(writer, sequence, syntax as unknown as Asn1SyntaxAny, (writer) => {
      const keys = syntax.keys
      for (let i = 0; i < keys.length; i++) {
        if (sequence[keys[i]] !== undefined) {
          this.encodeInternal(writer, sequence[keys[i]], syntax.standardItems[keys[i]] as Asn1SyntaxAny)
        }
        else if (syntax.standardItems[keys[i]].optional && syntax.standardItems[keys[i]].defaultValue !== undefined) {
          this.encodeInternal(writer, syntax.standardItems[keys[i]].defaultValue, syntax.standardItems[keys[i]] as Asn1SyntaxAny)
        }
      }
      const extKeys = syntax.extKeys
      for (let i = 0; i < extKeys.length; i++) {
        if (sequence[extKeys[i]] !== undefined) {
          this.encodeInternal(writer, sequence[extKeys[i]], syntax.extItems[extKeys[i]] as Asn1SyntaxAny)
        }
        else if (syntax.extItems[extKeys[i]].optional && syntax.extItems[extKeys[i]].defaultValue !== undefined) {
          this.encodeInternal(writer, syntax.extItems[extKeys[i]].defaultValue, syntax.extItems[extKeys[i]] as Asn1SyntaxAny)
        }
      }
    })
  }

  protected encodeSequence(writer: Writer, sequence: Data, syntax: Asn1SyntaxSequence, append?: boolean) {
    if (!append) {
      this.encodeSequenceInternal(writer, sequence, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        this.encodeSequenceInternal(writer, sequence, syntax)
      })
    }
  }

  protected encodeSet(writer: Writer, sequence: Data, syntax: Asn1SyntaxSet, append?: boolean) {
    if (!append) {
      this.encodeSequenceInternal(writer, sequence, syntax as unknown as Asn1SyntaxSequence)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        this.encodeSequenceInternal(writer, sequence, syntax as unknown as Asn1SyntaxSequence)
      })
    }
  }

  protected encodeSequenceOf(writer: Writer, list: Data[], syntax: Asn1SyntaxSequenceOf, append?: boolean) {
    if (!append) {
      super.encodeSequenceOf(writer, list, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeSequenceOf(writer, list, syntax)
      })
    }
  }

  protected encodeSetOf(writer: Writer, list: Data[], syntax: Asn1SyntaxSetOf, append?: boolean) {
    if (!append) {
      super.encodeSequenceOf(writer, list, syntax as unknown as Asn1SyntaxSequenceOf)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeSequenceOf(writer, list, syntax as unknown as Asn1SyntaxSequenceOf)
      })
    }
  }

  protected encodeUTF8String(writer: Writer, value: string, syntax: Asn1SyntaxUTF8String, append?: boolean) {
    if (!append) {
      super.encodeUTF8String(writer, value, syntax)
    }
    else {
      this.writeElement2(writer, syntax, (writer) => {
        super.encodeUTF8String(writer, value, syntax)
      })
    }
  }

  protected encodeInternal<T extends Asn1Syntax>(writer: Writer, data: Asn1Syntax2Value<T>, syntax: T, append?: boolean) {
    if (append) {
      switch (syntax.type) {
        case Asn1SyntaxType.BitString:
          this.encodeBitString(writer, data as string, syntax as unknown as Asn1SyntaxBitString, append)
          break
        case Asn1SyntaxType.BMPString:
          this.encodeBMPString(writer, data as string, syntax as unknown as Asn1SyntaxBMPString, append)
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
          this.encodeConstrainedString(writer, data as string, syntax as unknown as Asn1SyntaxConstrainedString, append)
          break
        case Asn1SyntaxType.OctetString:
        case Asn1SyntaxType.EmbeddedPDV:
          this.encodeOctetString(writer, data as Uint8Array, syntax as unknown as Asn1SyntaxOctetString, append)
          break
        case Asn1SyntaxType.Sequence:
          this.encodeSequence(writer, data as Data, syntax as unknown as Asn1SyntaxSequence, append)
          break
        case Asn1SyntaxType.Set:
          this.encodeSet(writer, data as Data, syntax as unknown as Asn1SyntaxSet, append)
          break
        case Asn1SyntaxType.SequenceOf:
          this.encodeSequenceOf(writer, data as Data[], syntax as unknown as Asn1SyntaxSequenceOf, append)
          break
        case Asn1SyntaxType.SetOf:
          this.encodeSetOf(writer, data as Data[], syntax as unknown as Asn1SyntaxSetOf, append)
          break
        case Asn1SyntaxType.UTF8String:
          this.encodeUTF8String(writer, data as string, syntax as unknown as Asn1SyntaxUTF8String, append)
          break
        default:
          super.encodeInternal(writer, data, syntax)
          break
      }
    }
    else {
      super.encodeInternal(writer, data, syntax)
    }
  }

  public encode<T extends Asn1Syntax>(data: Asn1Syntax2Value<T>, syntax: T, append: boolean = false): Uint8Array {
    this.buffers.length = 0
    this.encodeInternal(this.writer, data, syntax, append)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  public appendBitString(value: string, syntax: Asn1SyntaxBitString) {
    this.buffers.length = 0
    super.encodeBitString(this.writer, value, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  protected appendOctetString(value: Uint8Array, syntax: Asn1SyntaxOctetString) {
    this.buffers.length = 0
    super.encodeOctetString(this.writer, value, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  protected appendConstrainedString(value: string, syntax: Asn1SyntaxConstrainedString) {
    this.buffers.length = 0
    super.encodeConstrainedString(this.writer, value, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  protected appendBMPString(value: string, syntax: Asn1SyntaxBMPString) {
    this.buffers.length = 0
    super.encodeBMPString(this.writer, value, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  protected appendSequence(sequence: Data, syntax: Asn1SyntaxSequence) {
    this.buffers.length = 0
    super.encodeSequence(this.writer, sequence, syntax)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }

  protected appendSequenceOf(list: Data[], syntax: Asn1SyntaxSequenceOf) {
    this.buffers.length = 0
    list.forEach((value) => {
      super.encodeInternal(this.writer, value, syntax.syntax as Asn1SyntaxAny)
    })
  }

  protected appendUTF8String(value: string, syntax: Asn1SyntaxUTF8String) {
    this.buffers.length = 0
    super.encodeUTF8String(this.writer, value, syntax)
  }

  public endIndefinite() {
    this.buffers.length = 0
    this.writeByte(this.writer, 0)
    this.writeByte(this.writer, 0)
    this.writer.flush()
    return concatTypeArray(Uint8Array, this.buffers)
  }
}
