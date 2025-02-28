function getLowestSetBit(value: bigint): number {
  // Get bit length of lowest set bit
  let offset = (value & -value).toString(2).replace('-', '').length - 1
  if (offset < 0) {
    // Ensure non-negative index
    offset = 0
  }
  return offset
}

function frexp(x: number): [number, number] {
  if (x === 0) {
    return [0, 0]
  }

  const sign = Math.sign(x)
  x = Math.abs(x)

  // 获取 x 的二进制表示中的指数部分
  let exponent = Math.floor(Math.log2(x))

  // 计算尾数
  let mantissa = x / Math.pow(2, exponent)

  // 使得 mantissa 在 [0.5, 1) 范围内
  if (mantissa >= 1) {
    mantissa /= 2
    exponent += 1
  }

  return [mantissa * sign, exponent]
}

// Utility function to convert the mantissa integer to bytes
function unhexlify(hexString: string): number[] {
  if (hexString.length % 2 !== 0) {
    // Make sure it's even length
    hexString = '0' + hexString
  }
  let byteArray = []
  for (let i = 0; i < hexString.length; i += 2) {
    byteArray.push(parseInt(hexString.substring(i, i + 2), 16))
  }
  return byteArray
}

export default function encodeReal(data: number): Uint8Array {
  if (data === Infinity) {
    // +∞
    return new Uint8Array([0x40])
  }
  else if (data === -Infinity) {
    // -∞
    return new Uint8Array([0x41])
  }
  else if (isNaN(data)) {
    // NaN
    return new Uint8Array([0x42])
  }
  else if (data === 0.0) {
    // Zero is encoded as an empty byte array
    if (Object.is(data, -0.0)) {
      return new Uint8Array([0x43])
    }
    return new Uint8Array([])
  }

  let negativeBit = 0
  if (data < 0) {
    negativeBit = 0x40
    // Make the number positive for further processing
    data = -data
  }

  let [mantissa, exponent] = frexp(Math.abs(data))

  let mantissaBigInt = BigInt(Math.round(mantissa * Math.pow(2, 53)))
  const lowestSetBit = getLowestSetBit(mantissaBigInt)
  mantissaBigInt >>= BigInt(lowestSetBit)

  mantissaBigInt |= (0x80n << BigInt(8 * ((Math.floor(mantissaBigInt.toString(2).length / 8)) + 1)))
  let mantissaBytes = unhexlify(mantissaBigInt.toString(16).substring(2))

  // Adjust exponent for the shifting in mantissa
  exponent = 52 - lowestSetBit - exponent

  let exponentBytes: number[]

  if (exponent >= -128 && exponent <= 127) {
    // 1 byte exponent encoding
    exponentBytes = [0x80 | negativeBit, (0xff - exponent) & 0xff]
  }
  else if (exponent >= -32768 && exponent <= 32767) {
    // 2 byte exponent encoding
    let expValue = ((0xffff - exponent) & 0xffff)
    exponentBytes = [
      0x81 | negativeBit,
      (expValue >> 8) & 0xff,
      expValue & 0xff
    ]
  }
  else {
    throw new Error(`REAL exponent ${exponent} out of range.`)
  }
  // Return the combined encoded bytes
  return new Uint8Array([...exponentBytes, ...mantissaBytes])
}
