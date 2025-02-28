import { Asn1SyntaxSequence } from '../asn/defined'
import { Data } from '../asn/def'

export default function getSequenceMarker(sequence: Data, syntax: Asn1SyntaxSequence) {
  let optionalMarker: string = ''
  let extendMarker: string = ''

  let keys = syntax.keys

  for (let i = 0; i < keys.length; i++) {
    if (syntax.standardItems[keys[i]].optional) {
      if (sequence[keys[i]] !== undefined || syntax.standardItems[keys[i]].defaultValue) {
        optionalMarker += '1'
      }
      else {
        optionalMarker += '0'
      }
    }
  }

  if (syntax.extendable) {
    let extKeys = syntax.extKeys
    for (let i = 0; i < extKeys.length; i++) {
      if (sequence[extKeys[i]] !== undefined) {
        extendMarker += '1'
      }
      else {
        extendMarker += '0'
      }
    }
    let end = extendMarker.length - 1
    for (; end >= 0; end--) {
      if (+extendMarker[end]) {
        break
      }
    }
    if (end >= 0) {
      extendMarker = extendMarker.substring(0, end + 1)
    }
    else {
      extendMarker = ''
    }
  }

  return {
    optionalMarker,
    extendMarker
  }
}
