import { Data } from '../asn/def'
import { Asn1Syntax, Asn1SyntaxChoice, ChoiceTag, ChoiceTagClass, ChoiceValue } from '../asn/defined'

export default function getChoice(choice: Data, syntax: Asn1SyntaxChoice) {
  let tag: number
  let value: any
  let choiceSyntax: Asn1Syntax
  let tagClass: number
  let index: number = -1

  if (choice[ChoiceValue]) {
    value = choice[ChoiceValue]
    tag = choice[ChoiceTag]
    tagClass = choice[ChoiceTagClass]
    let key = syntax.keys.find((item) => syntax.standardItems[item].tag === tag && syntax.standardItems[item].tagClass === tagClass)
    if (!key) {
      key = syntax.extKeys.find((item) => syntax.extItems[item].tag === tag && syntax.extItems[item].tagClass === tagClass)
      index = syntax.extKeys.indexOf(key)
    }
    else {
      index = syntax.keys.indexOf(key)
    }
    choiceSyntax = syntax.standardItems[key] || syntax.extItems[key]
  }
  else {
    let standardKeys = syntax.keys
    for (let i = 0; i < standardKeys.length; i++) {
      if (choice[standardKeys[i]] !== undefined) {
        tag = syntax.standardItems[standardKeys[i]].tag
        tagClass = syntax.standardItems[standardKeys[i]].tagClass
        value = choice[standardKeys[i]]
        choiceSyntax = syntax.standardItems[standardKeys[i]]
        index = i
        break
      }
    }
    if (!value) {
      const extKeys = syntax.extKeys
      for (let i = 0; i < extKeys.length; i++) {
        if (choice[extKeys[i]] !== undefined) {
          tag = syntax.extItems[extKeys[i]].tag
          tagClass = syntax.extItems[extKeys[i]].tagClass
          value = choice[extKeys[i]]
          choiceSyntax = syntax.extItems[extKeys[i]]
          index = i + syntax.keys.length
          break
        }
      }
    }
  }
  return {
    tag,
    tagClass,
    value,
    choiceSyntax,
    index
  }
}
