export default function decodeOid(buffer: Uint8Array) {
  if (!buffer.length) {
    return ''
  }

  let subId = 0

  let data: number[] = []

  let i = 0
  let dataLen = buffer.length

  while (dataLen > 0) {
    let byte = 0
    subId = 0
    do {
      byte = buffer[i++]
      subId = (subId << 7) + (byte & 0x7f)
      dataLen--
    } while ((byte & 0x80) != 0)
    data.push(subId)
  }

  subId = data[0]
  if (subId < 40) {
    data.unshift(0)
  }
  else if (subId < 80) {
    data.unshift(1)
    data[1] = subId - 40
  }
  else {
    data.unshift(2)
    data[1] = subId - 80
  }
  return data.join('.')
}
