export default function encodeOid(oid: string) {
  const list = oid.split('.')
  if (list.length < 2) {
    throw new Error('invalid oid')
  }
  const data: number[] = []

  encode((+list[0] * 40) + (+list[1]))

  for (let i = 2; i < list.length; i++) {
    encode(+list[i])
  }

  return new Uint8Array(data)

  function encode(value: number) {
    if (value < 128) {
      data.push(value)
    }
    else {
      /* handle subid == 0 case */
      let mask = 0x7F
      let bits = 0

      /* testmask *MUST* !!!! be of an unsigned type */
      let testmask = 0x7F
      let testbits = 0
      while (testmask != 0) {
        /* if any bits set */
        if (value & testmask) {
          mask = testmask
          bits = testbits
        }
        testmask <<= 7
        testbits += 7
      }

      /* mask can't be zero here */
      while (mask != 0x7F) {
        /* fix a mask that got truncated above */
        if (mask == 0x1E00000) {
          mask = 0xFE00000
        }

        data.push(((value & mask) >> bits) | 0x80)

        mask >>= 7
        bits -= 7
      }
      data.push(value & mask)
    }
  }
}
