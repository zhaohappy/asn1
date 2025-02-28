
import { UINT32_MAX } from '../src/asn/constant'
import { ConstraintType } from '../src/asn/def'
import { Asn1Syntax2Value } from '../src/asn/defined'
import { defined, BerDecoder, BerEncoder } from '../src/index'

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    const data: Asn1Syntax2Value<typeof Syntax> = {
      b: 99
    }
    const buffer = encoder.encode(data, Syntax)
    const result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('real', () => {
    const Syntax = defined.Real()

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = '20230225123045Z'
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toStrictEqual(result)
  })

  test('External', () => {
    const Syntax = defined.External(defined.Sequence({
      a: defined.Integer()
    }))

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

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

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = 20
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer constrained extendable', () => {
    const Syntax = defined.Constraint(defined.Integer(), ConstraintType.Extendable, 12, 128)

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = 2
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer unconstrained big', () => {
    const Syntax = defined.Integer()

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = UINT32_MAX + 1230000
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })

  test('Integer unconstrained big negative', () => {
    const Syntax = defined.Integer()

    const encoder = new BerEncoder()
    const decoder = new BerDecoder()

    let data: Asn1Syntax2Value<typeof Syntax> = -(UINT32_MAX + 1230000)
    let buffer = encoder.encode(data, Syntax)
    let result = decoder.decode(buffer, Syntax)
    expect(data).toBe(result)
  })
})