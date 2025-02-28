import { Asn1SyntaxChoice } from '../asn/defined'

export default function getChoiceFromTag(index: number, syntax: Asn1SyntaxChoice) {
  let key: string
  if (index < syntax.keys.length) {
    key = syntax.keys[index]
  }
  else {
    key = syntax.extKeys[index - syntax.keys.length]
  }
  return {
    key,
    choiceSyntax: syntax.standardItems[key] || syntax.extItems[key]
  }
}
