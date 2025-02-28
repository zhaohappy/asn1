/**
 * bit 读取器
 */

export default class BitReader {

  private buffer: Uint8Array

  private pointer: number

  private bitsLeft: number

  private size: number

  private endPointer: number

  private pos: number

  public onFlush: (data: Uint8Array) => number

  /**
   * @param data 待读取的字节
   * @param bigEndian 是否按大端字节序读取，默认大端字节序（网络字节序）
   */
  constructor(size: number = 1 * 1024 * 1024) {
    this.pointer = 0
    this.bitsLeft = 8
    this.pos = 0

    this.size = size
    this.endPointer = 0

    this.buffer = new Uint8Array(this.size)
  }

  /**
   * 读取 1 个比特（不会移动读取指针）
   */
  public peekU1() {
    let result = 0
    if (this.remainingLength() < 1 || this.remainingLength() === 1 && this.bitsLeft === 0) {
      this.flush()
    }

    let pointer = this.pointer
    let bitsLeft = this.bitsLeft

    if (bitsLeft === 0) {
      pointer++
      bitsLeft = 8
    }

    result = (this.buffer[pointer] >> (bitsLeft - 1)) & 0x01
    return result
  }
  /**
   * 读取 1 个比特
   */
  public readU1() {
    let result = 0

    if (this.remainingLength() < 1 || this.remainingLength() === 1 && this.bitsLeft === 0) {
      this.flush()
    }

    this.bitsLeft--

    result = (this.buffer[this.pointer] >> this.bitsLeft) & 0x01

    if (this.bitsLeft === 0) {
      this.pointer++
      this.bitsLeft = 8
      this.pos++
    }

    return result
  }

  /**
   * 读取 n 个比特
   * 
   * @param n
   */
  public readU(n: number) {
    let result = 0
    for (let i = 0; i < n; i++) {
      result |= (this.readU1() << (n - i - 1))
    }
    return result
  }

  /**
   * 读取 n 个比特（不会移动读取指针）
   * 
   * @param n
   */
  public peekU(n: number) {
    const pointer = this.pointer
    const bitsLeft = this.bitsLeft
    const pos = this.pos
    const result = this.readU(n)
    this.pointer = pointer
    this.bitsLeft = bitsLeft
    this.pos = pos
    return result
  }

  /**
   * 获取剩余可读字节数
   * 
   * @returns 
   */
  public remainingLength() {
    return this.endPointer - this.pointer
  }

  /**
   * 当前字节剩余的 bit 数
   * 
   * @returns 
   */
  public getBitLeft() {
    return this.bitsLeft
  }

  /**
   * 跳过指定 bit 数
   * 
   * @param n 
   */
  public skip(n: number) {
    const byte = (n - (n % 8)) / 8

    this.pointer += byte
    this.pos += byte

    const bitsLeft = n % 8

    if (this.bitsLeft <= bitsLeft) {
      this.pointer++
      this.pos++
      this.bitsLeft = 8 - (bitsLeft - this.bitsLeft)
    }
    else {
      this.bitsLeft -= bitsLeft
    }
  }

  /**
   * 填充剩余缓冲区
   */
  public flush() {

    if (!this.onFlush) {
      throw Error('IOReader error, flush failed because of no flush callback')
    }

    if (this.bitsLeft === 0) {
      this.pointer++
      this.pos++
    }

    if (this.size - this.remainingLength() <= 0) {
      return
    }

    if (this.pointer < this.endPointer) {
      this.buffer.set(this.buffer.subarray(this.pointer, this.endPointer), 0)

      const len = this.onFlush(this.buffer.subarray(this.endPointer - this.pointer, this.size))

      if (len < 0) {
        throw Error('IOReader error, flush failed')
      }

      this.endPointer = this.endPointer - this.pointer + len
      this.pointer = 0
    }
    else {
      const len = this.onFlush(this.buffer)

      this.endPointer = len
      this.pointer = 0
      this.bitsLeft = 8

      if (len < 0) {
        throw Error('IOReader error, flush failed')
      }
    }
  }

  public readBuffer(length: number): Uint8Array {

    this.skipPadding()

    let buffer = new Uint8Array(length)
    if (this.remainingLength() < length) {
      let index = 0

      if (this.remainingLength() > 0) {
        const len = this.remainingLength()
        buffer.set(this.buffer.subarray(this.pointer, this.pointer + len), index)
        index += len
        this.pointer += len
        this.pos += len
        length -= len
      }

      while (length > 0) {
        this.flush()

        const len = Math.min(this.endPointer - this.pointer, length)

        buffer.set(this.buffer.subarray(this.pointer, this.pointer + len), index)

        index += len
        this.pointer += len
        this.pos += len
        length -= len
      }
    }
    else {
      buffer.set(this.buffer.subarray(this.pointer, this.pointer + length), 0)
      this.pointer += length
      this.pos += length
    }
    return buffer
  }

  public readByte() {
    let result = 0

    if (!this.remainingLength()) {
      this.flush()
    }

    result = this.buffer[this.pointer]

    this.pointer++
    this.pos++

    return result
  }

  public peekByte() {
    if (!this.remainingLength()) {
      this.flush()
    }
    return this.buffer[this.pointer]
  }

  public resetBuffer(buffer: Uint8Array) {
    this.pointer = this.endPointer = 0
    this.bitsLeft = 8
    this.pos = 0

    if (this.size - this.endPointer >= buffer.length) {
      this.buffer.set(buffer, this.endPointer)
      this.endPointer += buffer.length
    }
    else {
      this.buffer.set(this.buffer.subarray(this.pointer, this.endPointer), 0)
      this.endPointer = this.endPointer - this.pointer
      this.pointer = 0

      if (this.size - this.endPointer >= buffer.length) {
        this.buffer.set(buffer, this.endPointer)
        this.endPointer += buffer.length
      }
      else {
        const len = Math.min(this.size - this.endPointer, buffer.length)
        this.buffer.set(buffer.subarray(0, len), this.endPointer)
        this.endPointer += len
        console.warn('BSReader, call appendBuffer but the buffer\'s size is lagger then the remaining size')
      }
    }
  }

  /**
   * 对齐字节，当处在当前字节的第一个 bit 时不动，否则移动到下一个字节
   */
  public skipPadding() {
    if (this.bitsLeft < 8) {
      this.bitsLeft = 8
      this.pointer++
      this.pos++
    }
  }

  public getSize() {
    return this.size
  }

  public getPos() {
    return this.pos
  }

  public setPos(pos: number) {
    this.pointer += (pos - this.pos)
    this.bitsLeft = 8
    this.pos = pos
  }
}
