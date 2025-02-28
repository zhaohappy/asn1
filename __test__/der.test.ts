
import { UINT32_MAX } from '../src/asn/constant'
import { ConstraintType } from '../src/asn/def'
import { Asn1Syntax2Value } from '../src/asn/defined'
import { defined, DerDecoder, DerEncoder } from '../src/index'
import { base64ToUint8Array } from './util/base64'

describe('sequence', () => {
  test('sequence ', () => {
    const Syntax = defined.Sequence({
      a: defined.Boolean(),
      b: defined.Integer(),
      c: defined.NumericString(),
      d: defined.BMPString(),
      e: defined.BitString(),
      g: defined.Enumeration({
        a: defined.EnumerationValue('a', 0),
        b: defined.EnumerationValue('b', 1),
      }),
      h: defined.ObjectId(),
      f: defined.Choice({
        a: defined.Tag(defined.Boolean(), 0),
        b: defined.Tag(defined.Integer(), 1)
      }),
      j: defined.Sequence({
        a: defined.Boolean(),
        b: defined.Integer()
      }),
      i: defined.Set({
        a: defined.Tag(defined.Boolean(), 0),
        b: defined.Tag(defined.Integer(), 1)
      }),
      k: defined.SequenceOf(defined.Sequence({
        a: defined.Boolean(),
        b: defined.Integer()
      })),
      n: defined.SetOf(defined.Set({
        a: defined.Tag(defined.Boolean(), 0),
        b: defined.Tag(defined.Integer(), 1)
      })),
      m: defined.SequenceExt({
        a: defined.Boolean(),
        b: defined.Integer()
      }, {
        c: defined.BMPString()
      }),
      q: defined.Null()
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: true,
      b: 1,
      c: '123',
      d: '哈',
      e: '101',
      g: 1,
      h: '1.2.840.113549',
      f: {
        b: 3
      },
      j: {
        a: false,
        b: 4
      },
      i: {
        a: false,
        b: 6
      },
      k: [{
        a: true,
        b: 6
      }],
      n: [{
        a: true,
        b: 7
      }],
      m: {
        a: true,
        b: 8,
        c: '^_^'
      },
      q: null
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('enumeration ext ext value', () => {
    const Syntax = defined.Sequence({
      a: defined.EnumerationExt({
        a: defined.EnumerationValue('a', 0),
        b: defined.EnumerationValue('b', 1)
      }, {
        c: defined.EnumerationValue('c', 2)
      })
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: 2
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('enumeration ext standard', () => {
    const Syntax = defined.Sequence({
      a: defined.EnumerationExt({
        a: defined.EnumerationValue('a', 0),
        b: defined.EnumerationValue('b', 1)
      }, {
        c: defined.EnumerationValue('c', 2)
      })
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: 1
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('sequence ext, has ext value', () => {
    const Syntax = defined.SequenceExt({
      a: defined.Boolean(),
      b: defined.Integer()
    }, {
      c: defined.BMPString()
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: true,
      b: 34,
      c: '哈哈哈'
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('sequence ext, no ext value', () => {
    const Syntax = defined.SequenceExt({
      a: defined.Boolean(),
      b: defined.Integer()
    }, {
      c: defined.BMPString()
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: true,
      b: 34
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('sequence ext optional, no optional', () => {
    const Syntax = defined.SequenceExt({
      a: defined.Boolean(),
      b: defined.Integer(),
      d: defined.Tag(defined.Optional(defined.BitString()), 0),
      e: defined.UTF8String(),
      f: defined.Tag(defined.Optional(defined.VisibleString(), 'zshdhruhrs'), 1)
    }, {
      c: defined.BMPString(),
      g: defined.IA5String()
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: true,
      b: 34,
      c: '哈哈哈',
      e: '你好！'
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(Object.assign({ f: 'zshdhruhrs' }, data)).toStrictEqual(result)
  })

  test('sequence ext optional, has optional', () => {
    const Syntax = defined.SequenceExt({
      a: defined.Boolean(),
      b: defined.Integer(),
      d: defined.Tag(defined.Optional(defined.BitString()), 0),
      e: defined.UTF8String(),
      f: defined.Tag(defined.Optional(defined.VisibleString(), 'zshdhruhrs'), 1)
    }, {
      c: defined.BMPString(),
      g: defined.IA5String()
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      a: true,
      b: 34,
      d: '000111100011',
      c: '哈哈哈',
      e: '你好！',
      f: 'kkkkkkkk',
      g: 'fffddee'
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('choice ext, use ext', () => {
    const Syntax = defined.ChoiceExt({
      a: defined.Tag(defined.Boolean(), 0),
      b: defined.Tag(defined.Integer(), 1),
      e: defined.Tag(defined.UTF8String(), 2)
    }, {
      c: defined.Tag(defined.BMPString(), 3),
      g: defined.Tag(defined.IA5String(), 4)
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      c: '哈哈哈',
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('choice ext, un use ext', () => {
    const Syntax = defined.ChoiceExt({
      a: defined.Tag(defined.Boolean(), 0),
      b: defined.Tag(defined.Integer(), 1),
      e: defined.Tag(defined.UTF8String(), 2)
    }, {
      c: defined.Tag(defined.BMPString(), 3),
      g: defined.Tag(defined.IA5String(), 4)
    })

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      b: 99
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('real', () => {
    const Syntax = defined.Real()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = 0.123453
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 0.0
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -0.0
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = Infinity
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -Infinity
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 243564365.5346346324345
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -2464365.534634632434543
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = NaN
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('OctetString', () => {
    const Syntax = defined.OctetString()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = new Uint8Array([1, 2, 3, 4, 5, 6, 7])
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)

    function compareUint8Arrays(arr1: Uint8Array, arr2: Uint8Array) {
      if (arr1.length !== arr2.length) return false
      for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) return false
      }
      return true
    }
    expect(compareUint8Arrays(data, result)).toStrictEqual(true)
  })

  test('GeneralisedTime', () => {
    const Syntax = defined.GeneralisedTime()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = '20230225123045Z'
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)

    data = '20230225123045.123456Z'
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)

    data = '20230225123045.123456'
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('UniversalTime', () => {
    const Syntax = defined.UniversalTime()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = '20230225123045Z'
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('External', () => {
    const Syntax = defined.External(defined.Sequence({
      a: defined.Integer()
    }))

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = {
      encoding: {
        'single-ASN1-type': {
          a: 8
        }
      }
    }
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('Integer unconstrained', () => {
    const Syntax = defined.Integer()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = -123
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 145
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -145
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -32868
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 32868
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -8488608
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 8488608
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = -84655465465466456456n
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)

    data = 84655465465466456456n
    buffer = encoder.encode(data, Syntax)
    result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer constrained', () => {
    const Syntax = defined.Constraint(defined.Integer(), ConstraintType.Fixed, 12, 128)

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = 20
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer constrained extendable', () => {
    const Syntax = defined.Constraint(defined.Integer(), ConstraintType.Extendable, 12, 128)

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = 2
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer unconstrained big', () => {
    const Syntax = defined.Integer()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = UINT32_MAX + 1230000
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer unconstrained big negative', () => {
    const Syntax = defined.Integer()

    const encoder = new DerEncoder()
    const decoder = new DerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = -(UINT32_MAX + 1230000)
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('X.509', () => {

    const Version = defined.Integer()
    const CertificateSerialNumber = defined.Integer()
    const AlgorithmIdentifier = defined.Sequence({
      algorithm: defined.ObjectId(),
      parameters: defined.Optional(defined.Any())
    })

    const AttributeTypeAndValue = defined.Sequence({
      type: defined.ObjectId(),
      value: defined.Any()
    })
    const RelativeDistinguishedName = defined.Set({
      attributeTypeAndValue: AttributeTypeAndValue
    })
    const RDNSequence = defined.SequenceOf(RelativeDistinguishedName)
    const Name = defined.Choice({
      rdnSequence: RDNSequence
    })

    const Time = defined.Choice({
      utcTime: defined.UniversalTime(),
      generalTime: defined.GeneralisedTime()
    })
    const Validity = defined.Sequence({
      notBefore: Time,
      notAfter: Time
    })
    const UniqueIdentifier = defined.BitString()
    const SubjectPublicKeyInfo = defined.Sequence({
      algorithm: AlgorithmIdentifier,
      subjectPublicKey: defined.BitString()
    })
    const Extension = defined.Sequence({
      extnID: defined.ObjectId(),
      critical: defined.Optional(defined.Boolean(), false),
      extnValue: defined.OctetString()
    })
    const Extensions = defined.SequenceOf(Extension)

    const TBSCertificate = defined.Sequence({
      version: defined.Tag(defined.Optional(Version, 0), 0, defined.TagType.Explicitly),
      serialNumber: CertificateSerialNumber,
      signature: AlgorithmIdentifier,
      issuer: Name,
      validity: Validity,
      subject: Name,
      subjectPublicKeyInfo: SubjectPublicKeyInfo,
      issuerUniqueID: defined.Tag(defined.Optional(UniqueIdentifier), 1),
      subjectUniqueID: defined.Tag(defined.Optional(UniqueIdentifier), 2),
      extensions: defined.Tag(defined.Optional(Extensions), 3, defined.TagType.Explicitly)
    })

    const Certificate = defined.Sequence({
      tbsCertificate: TBSCertificate,
      signatureAlgorithm: AlgorithmIdentifier,
      signatureValue: defined.BitString()
    })

    const decoder = new DerDecoder()
    const encoder = new DerEncoder()

    const pem = `MIIDhTCCAm2gAwIBAgIJANN1woGC+bTxMA0GCSqGSIb3DQEBCwUAMFkxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxEjAQBgNVBAMMCWxvY2FsaG9zdDAeFw0xODA3MTAwNTM4NTRaFw0xOTA3MTAwNTM4NTRaMFkxCzAJBgNVBAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBXaWRnaXRzIFB0eSBMdGQxEjAQBgNVBAMMCWxvY2FsaG9zdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAJXAYm8v6RYSWrKcVu+2JRwr2xjNLj8xQsNEMu7zwpzTyRS+/fUTKhu90mq5zsrV/IE5IsUZhN5rUapTLdECiOAy2ncU/LyKvUwNIru3uLixea+zhu9LNQj91nzk0ezAA2w8e/3+SifKqCRPtbtHw7slHDAAaXZp1VOjXDcrirMpLYuLTSEKqAPeLm2IoJS8b3BuwdePeqHNaO3tMVhk8vvriMz6U+2PSDi5E2iwugqSY4kBYD5O8sa7f7MK71Tz/51YluTen/sLuWrhIzc59gzZGh7SX7/SukEAVLBMCwrSm7VTNkeQ8GjxqwLN2IrdG51/v9dRsxMNSusW4d9w44MCAwEAAaNQME4wHQYDVR0OBBYEFFbVeBnMFdzjH19N8ao6P4yUxX61MB8GA1UdIwQYMBaAFFbVeBnMFdzjH19N8ao6P4yUxX61MAwGA1UdEwQFMAMBAf8wDQYJKoZIhvcNAQELBQADggEBADdEj9/CBJxIR4Wo4ZHzKbO+LZkY57RcHOYprkYNovBQGvvTzsTqeqiAI5GUOZGra4beqobLAjcXweIbEe4S5zbIgq6IsejsLy3WuwWHUPo9i4Mgy5YUDg5qNUMvptN1ZoU+5MWbyc1bDYVPOf+h5FshDQYSMwNsFnhVXlnLQBgihzDeXBc5kVqzQesXdOj/xiH0Xuyvs3jvCt5sm31rY6jyMukofmb6M1c9FjLlpqYPO3kUNBD3GaDmwgSMs9akb8xZof8lrph7HEP2V/k+aW9W0f5MbW8JPmorLY5zlZHQHugnxwMoy/OVt0S3nVVXcpfgKlKUENbMI6RCMIzOdDc=`

    const buffer = base64ToUint8Array(pem)
    let result = decoder.decode(buffer, Certificate)

    const cert = {
      "tbsCertificate": {
        "version": 2,
        "serialNumber": 15237298775781913841n,
        "signature": {
          "algorithm": "1.2.840.113549.1.1.11",
          "parameters": null
        },
        "issuer": {
          "rdnSequence": [
            {"attributeTypeAndValue": {"type": "2.5.4.6", "value": "AU"}},
            {"attributeTypeAndValue": {"type": "2.5.4.8", "value": "Some-State"}},
            {"attributeTypeAndValue": {"type": "2.5.4.10", "value": "Internet Widgits Pty Ltd"}},
            {"attributeTypeAndValue": {"type": "2.5.4.3", "value": "localhost"}}
          ]
        },
        "validity": {
          "notBefore": {
            "utcTime": "180710053854Z"
          },
          "notAfter": {
            "utcTime": "190710053854Z"
          }
        },
        "subject": {
          "rdnSequence": [
            {"attributeTypeAndValue":{"type":"2.5.4.6","value":"AU"}},
            {"attributeTypeAndValue":{"type":"2.5.4.8","value":"Some-State"}},
            {"attributeTypeAndValue":{"type":"2.5.4.10","value":"Internet Widgits Pty Ltd"}},
            {"attributeTypeAndValue":{"type":"2.5.4.3","value":"localhost"}}
          ]
        },
        "subjectPublicKeyInfo": {
          "algorithm": {
            "algorithm": "1.2.840.113549.1.1.1", "parameters": null
          },
          "subjectPublicKey": "001100001000001000000001000010100000001010000010000000010000000100000000100101011100000001100010011011110010111111101001000101100001001001011010101100101001110001010110111011111011011000100101000111000010101111011011000110001100110100101110001111110011000101000010110000110100010000110010111011101111001111000010100111001101001111001001000101001011111011111101111101010001001100101010000110111011110111010010011010101011100111001110110010101101010111111100100000010011100100100010110001010001100110000100110111100110101101010001101010100101001100101101110100010000001010001000111000000011001011011010011101110001010011111100101111001000101010111101010011000000110100100010101110111011011110111000101110001011000101111001101011111011001110000110111011110100101100110101000010001111110111010110011111001110010011010001111011001100000000000011011011000011110001111011111111011111111001001010001001111100101010101000001001000100111110110101101110110100011111000011101110110010010100011100001100000000000001101001011101100110100111010101010100111010001101011100001101110010101110001010101100110010100100101101100010111000101101001101001000010000101010101000000000111101111000101110011011011000100010100000100101001011110001101111011100000110111011000001110101111000111101111010101000011100110101101000111011011110110100110001010110000110010011110010111110111110101110001000110011001111101001010011111011011000111101001000001110001011100100010011011010001011000010111010000010101001001001100011100010010000000101100000001111100100111011110010110001101011101101111111101100110000101011101111010101001111001111111111100111010101100010010110111001001101111010011111111110110000101110111001011010101110000100100011001101110011100111110110000011001101100100011010000111101101001001011111101111111101001010111010010000010000000001010100101100000100110000001011000010101101001010011011101101010101001100110110010001111001000011110000011010001111000110101011000000101100110111011000100010101101110100011011100111010111111110111111110101110101000110110011000100110000110101001010111010110001011011100001110111110111000011100011100000110000001000000011000000010000000000000001"
        },
        "extensions": [
          {
            "extnID": "2.5.29.14",
            "extnValue": new Uint8Array([4, 20, 86, 213, 120, 25, 204, 21, 220, 227, 31, 95, 77, 241, 170, 58, 63, 140, 148, 197, 126, 181]),
            "critical": false
          },
          {
            "extnID": "2.5.29.35",
            "extnValue": new Uint8Array([48, 22, 128, 20, 86, 213, 120, 25, 204, 21, 220, 227, 31, 95, 77, 241, 170, 58, 63, 140, 148, 197, 126, 181]),
            "critical": false
          },
          {
            "extnID": "2.5.29.19",
            "extnValue": new Uint8Array([48, 3, 1, 1, 255]),
            "critical": false
          }
        ]
      },
      "signatureAlgorithm": {
        "algorithm": "1.2.840.113549.1.1.11",
        "parameters": null
      },
      "signatureValue": "00110111010001001000111111011111110000100000010010011100010010000100011110000101101010001110000110010001111100110010100110110011101111100010110110011001000110001110011110110100010111000001110011100110001010011010111001000110000011011010001011110000010100000001101011111011110100111100111011000100111010100111101010101000100000000010001110010001100101000011100110010001101010110110101110000110110111101010101010000110110010110000001000110111000101111100000111100010000110110001000111101110000100101110011100110110110010001000001010101110100010001011000111101000111011000010111100101101110101101011101100000101100001110101000011111010001111011000101110000011001000001100101110010110000101000000111000001110011010100011010101000011001011111010011011010011011101010110011010000101001111101110010011000101100110111100100111001101010110110000110110000101010011110011100111111111101000011110010001011011001000010000110100000110000100100011001100000011011011000001011001111000010101010101111001011001110010110100000000011000001000101000011100110000110111100101110000010111001110011001000101011010101100110100000111101011000101110111010011101000111111111100011000100001111101000101111011101100101011111011001101111000111011110000101011011110011011001001101101111101011010110110001110101000111100100011001011101001001010000111111001100110111110100011001101010111001111010001011000110010111001011010011010100110000011110011101101111001000101000011010000010000111101110001100110100000111001101100001000000100100011001011001111010110101001000110111111001100010110011010000111111111001001011010111010011000011110110001110001000011111101100101011111111001001111100110100101101111010101101101000111111110010011000110110101101111000010010011111001101010001010110010110110001110011100111001010110010001110100000001111011101000001001111100011100000011001010001100101111110011100101011011011101000100101101111001110101010101010101110111001010010111111000000010101001010010100101000001000011010110110011000010001110100100010000100011000010001100110011100111010000110111"
    }

    expect(result).toStrictEqual(cert)

    const certEncode = {
      "tbsCertificate": {
        "version": 2,
        "serialNumber": 15237298775781913841n,
        "signature": {
          "algorithm": "1.2.840.113549.1.1.11",
          "parameters": encoder.encode(null, defined.Null())
        },
        "issuer": {
          "rdnSequence": [
            {"attributeTypeAndValue": {"type": "2.5.4.6", "value": encoder.encode("AU", defined.PrintableString())}},
            {"attributeTypeAndValue": {"type": "2.5.4.8", "value": encoder.encode("Some-State", defined.UTF8String())}},
            {"attributeTypeAndValue": {"type": "2.5.4.10", "value": encoder.encode("Internet Widgits Pty Ltd", defined.UTF8String())}},
            {"attributeTypeAndValue": {"type": "2.5.4.3", "value": encoder.encode("localhost", defined.UTF8String())}}
          ]
        },
        "validity": {
          "notBefore": {
            "utcTime": "180710053854Z"
          },
          "notAfter": {
            "utcTime": "190710053854Z"
          }
        },
        "subject": {
          "rdnSequence": [
            {"attributeTypeAndValue": {"type": "2.5.4.6", "value": encoder.encode("AU", defined.PrintableString())}},
            {"attributeTypeAndValue": {"type": "2.5.4.8", "value": encoder.encode("Some-State", defined.UTF8String())}},
            {"attributeTypeAndValue": {"type": "2.5.4.10", "value": encoder.encode("Internet Widgits Pty Ltd", defined.UTF8String())}},
            {"attributeTypeAndValue": {"type": "2.5.4.3", "value": encoder.encode("localhost", defined.UTF8String())}}
          ]
        },
        "subjectPublicKeyInfo": {
          "algorithm": {
            "algorithm": "1.2.840.113549.1.1.1", "parameters": encoder.encode(null, defined.Null())
          },
          "subjectPublicKey": "001100001000001000000001000010100000001010000010000000010000000100000000100101011100000001100010011011110010111111101001000101100001001001011010101100101001110001010110111011111011011000100101000111000010101111011011000110001100110100101110001111110011000101000010110000110100010000110010111011101111001111000010100111001101001111001001000101001011111011111101111101010001001100101010000110111011110111010010011010101011100111001110110010101101010111111100100000010011100100100010110001010001100110000100110111100110101101010001101010100101001100101101110100010000001010001000111000000011001011011010011101110001010011111100101111001000101010111101010011000000110100100010101110111011011110111000101110001011000101111001101011111011001110000110111011110100101100110101000010001111110111010110011111001110010011010001111011001100000000000011011011000011110001111011111111011111111001001010001001111100101010101000001001000100111110110101101110110100011111000011101110110010010100011100001100000000000001101001011101100110100111010101010100111010001101011100001101110010101110001010101100110010100100101101100010111000101101001101001000010000101010101000000000111101111000101110011011011000100010100000100101001011110001101111011100000110111011000001110101111000111101111010101000011100110101101000111011011110110100110001010110000110010011110010111110111110101110001000110011001111101001010011111011011000111101001000001110001011100100010011011010001011000010111010000010101001001001100011100010010000000101100000001111100100111011110010110001101011101101111111101100110000101011101111010101001111001111111111100111010101100010010110111001001101111010011111111110110000101110111001011010101110000100100011001101110011100111110110000011001101100100011010000111101101001001011111101111111101001010111010010000010000000001010100101100000100110000001011000010101101001010011011101101010101001100110110010001111001000011110000011010001111000110101011000000101100110111011000100010101101110100011011100111010111111110111111110101110101000110110011000100110000110101001010111010110001011011100001110111110111000011100011100000110000001000000011000000010000000000000001"
        },
        "extensions": [
          {
            "extnID": "2.5.29.14",
            "extnValue": new Uint8Array([4, 20, 86, 213, 120, 25, 204, 21, 220, 227, 31, 95, 77, 241, 170, 58, 63, 140, 148, 197, 126, 181]),
            "critical": false
          },
          {
            "extnID": "2.5.29.35",
            "extnValue": new Uint8Array([48, 22, 128, 20, 86, 213, 120, 25, 204, 21, 220, 227, 31, 95, 77, 241, 170, 58, 63, 140, 148, 197, 126, 181]),
            "critical": false
          },
          {
            "extnID": "2.5.29.19",
            "extnValue": new Uint8Array([48, 3, 1, 1, 255]),
            "critical": false
          }
        ]
      },
      "signatureAlgorithm": {
        "algorithm": "1.2.840.113549.1.1.11",
        "parameters": encoder.encode(null, defined.Null())
      },
      "signatureValue": "00110111010001001000111111011111110000100000010010011100010010000100011110000101101010001110000110010001111100110010100110110011101111100010110110011001000110001110011110110100010111000001110011100110001010011010111001000110000011011010001011110000010100000001101011111011110100111100111011000100111010100111101010101000100000000010001110010001100101000011100110010001101010110110101110000110110111101010101010000110110010110000001000110111000101111100000111100010000110110001000111101110000100101110011100110110110010001000001010101110100010001011000111101000111011000010111100101101110101101011101100000101100001110101000011111010001111011000101110000011001000001100101110010110000101000000111000001110011010100011010101000011001011111010011011010011011101010110011010000101001111101110010011000101100110111100100111001101010110110000110110000101010011110011100111111111101000011110010001011011001000010000110100000110000100100011001100000011011011000001011001111000010101010101111001011001110010110100000000011000001000101000011100110000110111100101110000010111001110011001000101011010101100110100000111101011000101110111010011101000111111111100011000100001111101000101111011101100101011111011001101111000111011110000101011011110011011001001101101111101011010110110001110101000111100100011001011101001001010000111111001100110111110100011001101010111001111010001011000110010111001011010011010100110000011110011101101111001000101000011010000010000111101110001100110100000111001101100001000000100100011001011001111010110101001000110111111001100010110011010000111111111001001011010111010011000011110110001110001000011111101100101011111111001001111100110100101101111010101101101000111111110010011000110110101101111000010010011111001101010001010110010110110001110011100111001010110010001110100000001111011101000001001111100011100000011001010001100101111110011100101011011011101000100101101111001110101010101010101110111001010010111111000000010101001010010100101000001000011010110110011000010001110100100010000100011000010001100110011100111010000110111"
    }

    const encodeBuffer = encoder.encode(certEncode, Certificate)

    expect(encodeBuffer).toStrictEqual(buffer)
  })

})