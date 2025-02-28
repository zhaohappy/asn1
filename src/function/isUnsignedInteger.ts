import { ConstraintType } from '../asn/def'
import { Asn1SyntaxInteger } from '../asn/defined'

export default function isUnsignedInteger(syntax: Asn1SyntaxInteger) {
  return syntax.constraint !== ConstraintType.Unconstrained && syntax.lowerLimit >= 0
}
