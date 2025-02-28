function hexlify(data: Uint8Array): string {
  // 使用 `map` 将每个字节转换为十六进制，并合并成一个字符串
  return Array.from(data)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function decodeRealBinary(control: number, data: Uint8Array): number {
  let exponent: number
  let offset: number

  // 控制字节为 0x80 或 0xc0 的情况
  if (control === 0x80 || control === 0xc0) {
    // 获取指数
    exponent = data[1]
    // 如果指数的高位为 1，则表示负数
    if (exponent & 0x80) {
      // 处理负指数
      exponent -= 0x100
    }
    offset = 2
  }
  // 控制字节为 0x81 或 0xc1 的情况
  else if (control === 0x81 || control === 0xc1) {
    // 获取 16 位指数
    exponent = (data[1] << 8) | data[2]

    // 如果指数的最高位为 1，则表示负数
    if (exponent & 0x8000) {
      // 处理负指数
      exponent -= 0x10000
    }
    offset = 3
  }
  else {
    throw new Error(`Unsupported binary REAL control word 0x${control.toString(16)}.`)
  }

  // 计算尾数部分
  let mantissa = parseInt(hexlify(data.slice(offset)), 16)

  // 计算解码后的浮动数
  let decoded = mantissa * Math.pow(2, exponent)

  // 检查控制字节的符号位
  if (control & 0x40) {
    // 如果符号位为 1，则尾数为负数
    decoded *= -1
  }
  return decoded
}


export default function decodeReal(data: Uint8Array): number {

  if (data.length === 0) {
    return 0.0
  }

  let control = data[0]

  if (control & 0x80) {
    return decodeRealBinary(control, data)
  }
  else if (control & 0x40) {
    if (control === 0x40) {
      return Infinity
    }
    else if (control === 0x41) {
      return -Infinity
    }
    else if (control === 0x42) {
      return NaN
    }
    else if (control === 0x43) {
      return -0.0
    }
    else {
      throw new Error('not support')
    }
  }
  else {
    let v = ''
    for (let i = 1; i < data.length; i++) {
      v += String.fromCharCode(data[i])
    }
    v.replace(',', '.')
    return +v
  }
}
