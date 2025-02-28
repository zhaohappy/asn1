import { Asn1SyntaxChoice } from '../asn/defined'

export default function getChoiceFromTag(tag: number, tagClass: number, syntax: Asn1SyntaxChoice) {
  let key: string
  let keys = syntax.keys
  for (let i = 0; i < keys.length; i++) {
    if (syntax.standardItems[keys[i]].tagClass === tagClass) {
      if (syntax.standardItems[keys[i]].tag === tag) {
        key = keys[i]
        break
      }
    }
  }

  if (syntax.extendable) {
    let extKeys = syntax.extKeys
    for (let i = 0; i < extKeys.length; i++) {
      if (syntax.extItems[extKeys[i]].tagClass === tagClass) {
        if (syntax.extItems[extKeys[i]].tag === tag) {
          key = extKeys[i]
          break
        }
      }
    }
  }
  return {
    key,
    choiceSyntax: syntax.standardItems[key] || syntax.extItems[key]
  }
}
