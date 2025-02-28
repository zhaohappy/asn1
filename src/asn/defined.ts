import deepClone from '../function/deepClone'
import countBits from '../function/countBits'
import { UINT32_MAX } from './constant'
import { TagClass, ConstraintType, UniversalTags, Data, TagType } from './def'

export const MaximumArraySize = 128
export const MaximumStringSize = 16 * 1024
export const MaximumSetSize = 512

export const ChoiceValue = Symbol('value')
export const ChoiceTag = Symbol('tag')
export const ChoiceTagClass = Symbol('tagClass')
export const SequenceExtendable = Symbol('extendable')

let GeneralCharSet = ''
for (let i = 0; i < 256; i++) {
  GeneralCharSet += String.fromCharCode(i)
}

export {
  ConstraintType,
  TagClass,
  UniversalTags,
  TagType
}

export enum Asn1SyntaxType {
  Type,
  Null,
  Boolean,
  Integer,
  Enumeration,
  EnumerationValue,

  BitStringIndex,
  BitString,
  BitStringWithIndex,
  OctetString,
  IA5String,
  BMPString,
  GraphicString,
  VisibleString,
  GeneralString,
  UniversalString,
  NumericString,
  PrintableString,
  TeletexString,
  VideotexString,
  UTF8String,

  ObjectId,
  ObjectDescriptor,
  ExternalType,
  Real,
  EmbeddedPDV,
  GeneralisedTime,
  UniversalTime,

  Sequence,
  Set,
  SequenceOf,
  SetOf,
  Choice,
  Any
}

export interface Asn1Syntax {
  type: Asn1SyntaxType
  tag?: number
  asn1Tag?: number
  tagClass: TagClass
  tagType?: TagType
  optional: boolean
  defaultValue: any
  extendable: boolean
}

export interface Asn1SyntaxConstrained extends Asn1Syntax {
  constraint: ConstraintType
  lowerLimit: number
  upperLimit: number
}

export interface Asn1SyntaxSequence extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Sequence
  keys: string[]
  extKeys: string[]
  standardItems: Record<string, Asn1Syntax>
  extItems: Record<string, Asn1Syntax>
  optionalCount: number
}

export interface Asn1SyntaxSequenceOf extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.SequenceOf
  syntax: Asn1Syntax
}

export interface Asn1SyntaxSet extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Set
  keys: string[]
  extKeys: string[]
  standardItems: Record<string, Asn1Syntax>
  extItems: Record<string, Asn1Syntax>
}
export interface Asn1SyntaxSetOf extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.SetOf
  syntax: Asn1Syntax
}

export interface Asn1SyntaxChoice extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Choice
  numChoices: number
  keys: string[]
  extKeys: string[]
  standardItems: Record<string, Asn1Syntax>
  extItems: Record<string, Asn1Syntax>
}

export interface Asn1SyntaxEnumerationValue extends Asn1Syntax {
  type: typeof Asn1SyntaxType.EnumerationValue
  name: string
  value: number
}

export interface Asn1SyntaxEnumeration extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Enumeration
  standardItems: Record<string, Asn1SyntaxEnumerationValue>
  extItems: Record<string, Asn1SyntaxEnumerationValue>
  maxEnumValue?: number
}

export interface Asn1SyntaxBoolean extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Boolean
}

export interface Asn1SyntaxNull extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Null
}

export interface Asn1SyntaxInteger extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.Integer
}

export interface Asn1SyntaxOctetString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.OctetString
}

export interface Asn1SyntaxUTF8String extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.UTF8String
}

export interface Asn1SyntaxEmbeddedPDV extends Asn1Syntax {
  type: typeof Asn1SyntaxType.EmbeddedPDV
}

export interface Asn1SyntaxAny extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Any
}

export interface Asn1SyntaxConstrainedString extends Asn1SyntaxConstrained {
  type: Asn1SyntaxType
  canonicalSet: string
  canonicalSetBits: number
  charSet: string
  charSetAlignedBits: number
  charSetUnalignedBits: number
}

export interface Asn1SyntaxIA5String extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.IA5String
}

export interface Asn1SyntaxBMPString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.BMPString
  charSetAlignedBits: number
  charSetUnalignedBits: number
  firstChar: number
  lastChar: number
  charSet: string
}

export interface Asn1SyntaxGraphicString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.GraphicString
}

export interface Asn1SyntaxVisibleString extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.VisibleString
}

export interface Asn1SyntaxGeneralString extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.GeneralString
}

export interface Asn1SyntaxUniversalString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.UniversalString
}

export interface Asn1SyntaxNumericString extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.NumericString
}

export interface Asn1SyntaxPrintableString extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.PrintableString
}

export interface Asn1SyntaxTeletexString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.TeletexString
}

export interface Asn1SyntaxVideotexString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.VideotexString
}

export interface Asn1SyntaxBitStringIndex extends Asn1Syntax {
  type: typeof Asn1SyntaxType.BitStringIndex
  name: string
  index: number
}

export interface Asn1SyntaxBitString extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.BitString
}

export interface Asn1SyntaxBitStringWithIndex extends Asn1SyntaxConstrained {
  type: typeof Asn1SyntaxType.BitStringWithIndex
  indexes: Asn1SyntaxBitStringIndex[]
}

export interface Asn1SyntaxObjectId extends Asn1Syntax {
  type: typeof Asn1SyntaxType.ObjectId
}

export interface Asn1SyntaxObjectDescriptor extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.ObjectDescriptor
}

export interface Asn1SyntaxReal extends Asn1Syntax {
  type: typeof Asn1SyntaxType.Real
}

export interface Asn1SyntaxGeneralisedTime extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.GeneralisedTime

}

export interface Asn1SyntaxUniversalTime extends Asn1SyntaxConstrainedString {
  type: typeof Asn1SyntaxType.UniversalTime
}

export interface Asn1SyntaxExternal extends Asn1Syntax {
  type: typeof Asn1SyntaxType.ExternalType
  sequence: {
    type: typeof Asn1SyntaxType.Sequence
    tagClass: typeof TagClass.Universal
    optional: false
    defaultValue: undefined
    extendable: false
    keys: string[]
    extKeys: string[]
    optionalCount: number
    standardItems: {
      'direct-reference': Asn1SyntaxObjectId
      'indirect-reference': Asn1SyntaxInteger
      'data-value-descriptor': Asn1SyntaxObjectDescriptor
      encoding: {
        type: typeof Asn1SyntaxType.Choice
        tagClass: typeof TagClass.Universal
        optional: false
        defaultValue: undefined
        extendable: false
        numChoices: number
        keys: string[]
        extKeys: string[]
        standardItems: {
          'single-ASN1-type': Asn1Syntax
          'octet-aligned': Asn1SyntaxOctetString
          'arbitrary': Asn1SyntaxBitString
        }
        extItems: Record<string, Asn1Syntax>
      }
    }
    extItems: Record<string, Asn1Syntax>
  }
}

type ValueOf<T> = T[keyof T]

type OnlyOne<T> = {
  [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, undefined>>
}[keyof T]

type OptionalKeys<T extends Record<string, Asn1Syntax>> = {
  [K in keyof T]: T[K]['optional'] extends true ? K : never
}[keyof T]

type NoneOptionalKeys<T extends Record<string, Asn1Syntax>> = {
  [K in keyof T]: T[K]['optional'] extends false ? K : never
}[keyof T]

type Asn1SyntaxObject2Value<T extends Record<string, Asn1Syntax>> = Omit<{
  [K in keyof T]: T[K]['optional'] extends true ? never : Asn1Syntax2Value<T[K]>
}, OptionalKeys<T>> & Partial<Omit<{
  [K in keyof T]: T[K]['optional'] extends true ? Asn1Syntax2Value<T[K]> : never
}, NoneOptionalKeys<T>>>
type Asn1SyntaxSequence2Value<T extends Asn1SyntaxSequence> = Asn1SyntaxObject2Value<T['standardItems']>
& (T['extendable'] extends true ? Partial<Asn1SyntaxObject2Value<T['extItems']>> : {})
& {
  [SequenceExtendable]?: Uint8Array[]
}
type Asn1SyntaxSet2Value<T extends Asn1SyntaxSet> = Asn1SyntaxObject2Value<T['standardItems']>
& (T['extendable'] extends true ? Partial<Asn1SyntaxObject2Value<T['extItems']>> : {})
& {
  [SequenceExtendable]?: Uint8Array[]
}
type Asn1SyntaxChoice2Value<T extends Asn1SyntaxChoice> = OnlyOne<Asn1SyntaxObject2Value<T['standardItems']> & (T['extendable'] extends true ? Asn1SyntaxObject2Value<T['extItems']> : {})> & {
  [ChoiceValue]?: ValueOf<Asn1SyntaxObject2Value<T['standardItems']> & (T['extendable'] extends true ? Asn1SyntaxObject2Value<T['extItems']> : {})>
  [ChoiceTag]?: number
}
type Asn1SyntaxBitStringIndexArray2Value<T extends Asn1SyntaxBitStringIndex[]> = {
  [K in T[number]['name']]: boolean
}

export type Asn1Syntax2Value<T extends Asn1Syntax> =
  T extends Asn1SyntaxSequence
    ? Asn1SyntaxSequence2Value<T>
    : T extends Asn1SyntaxChoice
      ? Asn1SyntaxChoice2Value<T>
      : T extends Asn1SyntaxBoolean
        ? boolean
        : T extends Asn1SyntaxInteger
          ? number | bigint
          : T extends Asn1SyntaxNull
            ? null
            : T extends Asn1SyntaxOctetString
              ? Uint8Array
              : T extends Asn1SyntaxBitStringWithIndex
                ? Asn1SyntaxBitStringIndexArray2Value<T['indexes']>
                : T extends Asn1SyntaxBitString
                  ? string
                  : T extends Asn1SyntaxSequenceOf
                    ? Asn1Syntax2Value<T['syntax']>[]
                    : T extends Asn1SyntaxSet
                      ? Asn1SyntaxSet2Value<T>
                      : T extends Asn1SyntaxSetOf
                        ? Asn1Syntax2Value<T['syntax']>[]
                        : T extends Asn1SyntaxIA5String
                          ? string
                          : T extends Asn1SyntaxBMPString
                            ? string
                            : T extends Asn1SyntaxVisibleString
                              ? string
                              : T extends Asn1SyntaxGeneralString
                                ? string
                                : T extends Asn1SyntaxGraphicString
                                  ? string
                                  : T extends Asn1SyntaxUniversalString
                                    ? string
                                    : T extends Asn1SyntaxObjectId
                                      ? string
                                      : T extends Asn1SyntaxNumericString
                                        ? string
                                        : T extends Asn1SyntaxPrintableString
                                          ? string
                                          : T extends Asn1SyntaxVideotexString
                                            ? string
                                            : T extends Asn1SyntaxTeletexString
                                              ? string
                                              : T extends Asn1SyntaxObjectDescriptor
                                                ? string
                                                : T extends Asn1SyntaxReal
                                                  ? number
                                                  : T extends Asn1SyntaxExternal
                                                    ? {
                                                      'direct-reference'?: string
                                                      'indirect-reference'?: number
                                                      'data-value-descriptor'?: string
                                                      encoding: Asn1Syntax2Value<T['sequence']['standardItems']['encoding']>
                                                    }
                                                    : T extends Asn1SyntaxEmbeddedPDV
                                                      ? Uint8Array
                                                      : T extends Asn1SyntaxGeneralisedTime
                                                        ? string
                                                        : T extends Asn1SyntaxUniversalTime
                                                          ? string
                                                          : T extends Asn1SyntaxUTF8String
                                                            ? string
                                                            : T extends Asn1SyntaxEnumeration
                                                              ? number
                                                              : T extends Asn1SyntaxAny
                                                                ? any
                                                                : never

export function Optional<T extends Asn1Syntax>(syntax: T, value?: Asn1Syntax2Value<T>) {
  syntax = deepClone(syntax)
  syntax.optional = true
  if (value !== undefined) {
    syntax.defaultValue = value
  }
  return syntax as (Omit<T, 'optional'> & { optional: true })
}

export function Tag<T extends Asn1Syntax>(
  syntax: T,
  tag: number,
  tagType: TagType = TagType.Implicitly,
  tagClass: TagClass = TagClass.ContextSpecific
) {
  syntax = deepClone(syntax)
  syntax.asn1Tag = syntax.tag
  syntax.tag = tag
  syntax.tagClass = tagClass
  syntax.tagType = tagType

  return syntax
}

export function Constraint<T extends Asn1SyntaxConstrained>(syntax: T, constraint: ConstraintType, lowerLimit: number, upperLimit: number) {
  if (lowerLimit < 0
    && (syntax.type === Asn1SyntaxType.BMPString
      || syntax.type === Asn1SyntaxType.BitString
      || syntax.type === Asn1SyntaxType.IA5String
      || syntax.type === Asn1SyntaxType.UTF8String
      || syntax.type === Asn1SyntaxType.OctetString
      || syntax.type === Asn1SyntaxType.GeneralString
      || syntax.type === Asn1SyntaxType.GraphicString
      || syntax.type === Asn1SyntaxType.NumericString
      || syntax.type === Asn1SyntaxType.TeletexString
      || syntax.type === Asn1SyntaxType.VideotexString
      || syntax.type === Asn1SyntaxType.VisibleString
    )) {
    throw new Error('invalid constraint')
  }
  syntax = deepClone(syntax)

  syntax.constraint = constraint
  syntax.lowerLimit = lowerLimit
  syntax.upperLimit = upperLimit
  if (constraint === ConstraintType.Extendable) {
    syntax.extendable = true
  }
  return syntax
}

function setCharSetBits<T extends Asn1SyntaxConstrainedString>(syntax: T) {
  syntax = deepClone(syntax)

  if (!syntax.charSet) {
    syntax.charSet = syntax.canonicalSet
  }

  let charSetUnalignedBits = countBits(syntax.charSet.length)
  let charSetAlignedBits = 1
  while (charSetUnalignedBits > charSetAlignedBits) {
    charSetAlignedBits <<= 1
  }
  syntax.charSetUnalignedBits = charSetUnalignedBits
  syntax.charSetAlignedBits = charSetAlignedBits
  return syntax
}

export function CharSet<T extends Asn1SyntaxConstrainedString>(syntax: T, charSet: string, type: ConstraintType) {
  syntax = deepClone(syntax)
  if (type === ConstraintType.Unconstrained) {
    syntax.charSet = syntax.canonicalSet
  }
  else if (charSet.length >= MaximumSetSize) {
    throw new Error('out of max set size')
  }
  else {
    if (!charSet.length) {
      throw new Error('char set size must not 0')
    }
    let set = ''
    for (let i = 0; i < charSet.length; i++) {
      if (syntax.canonicalSet.indexOf(charSet[i]) > -1) {
        set += charSet[i]
      }
    }
    syntax.charSet = set
  }
  return setCharSetBits(syntax)
}

export function Sequence<T extends Record<string, Asn1Syntax>>(standard: T, keys?: string[]) {
  if (!keys) {
    keys = Object.keys(standard)
  }
  let optionalCount = 0
  for (let i = 0; i < keys.length; i++) {
    if (standard[keys[i]].optional) {
      optionalCount++
    }
  }
  return {
    type: Asn1SyntaxType.Sequence,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Sequence,
    keys,
    extKeys: [] as string[],
    optional: false,
    extendable: false,
    defaultValue: undefined,
    standardItems: standard,
    extItems: {} as Record<string, Asn1Syntax>,
    optionalCount
  } as const
}

export function SequenceExt<T extends Record<string, Asn1Syntax>, U extends Record<string, Asn1Syntax>>(standard: T, ext: U, keys?: string[], extKeys?: string[]) {
  if (!keys) {
    keys = Object.keys(standard)
  }
  let optionalCount = 0
  for (let i = 0; i < keys.length; i++) {
    if (standard[keys[i]].optional) {
      optionalCount++
    }
  }
  return {
    type: Asn1SyntaxType.Sequence,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Sequence,
    keys: keys,
    extKeys: extKeys ? extKeys : Object.keys(ext),
    optional: false,
    extendable: true,
    defaultValue: undefined,
    standardItems: standard,
    extItems: ext,
    optionalCount
  } as const
}

export function SequenceOf<T extends Asn1Syntax>(syntax: T) {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.SequenceOf,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Sequence,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    syntax
  } as const
}

export function Set<T extends Record<string, Asn1Syntax>>(standard: T) {
  return {
    type: Asn1SyntaxType.Set,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Set,
    keys: Object.keys(standard),
    extKeys: [] as string[],
    optional: false,
    extendable: false,
    defaultValue: undefined,
    standardItems: standard,
    extItems: {} as Record<string, Asn1Syntax>
  } as const
}

export function SetExt<T extends Record<string, Asn1Syntax>, U extends Record<string, Asn1Syntax>>(standard: T, ext: U) {
  return {
    type: Asn1SyntaxType.Set,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Set,
    keys: Object.keys(standard),
    extKeys: Object.keys(ext),
    optional: false,
    extendable: true,
    defaultValue: undefined,
    standardItems: standard,
    extItems: ext
  } as const
}

export function SetOf<T extends Asn1Syntax>(syntax: T) {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.SetOf,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Set,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    syntax
  } as const
}

export function Choice<T extends Record<string, Asn1Syntax>>(standard: T) {
  return {
    type: Asn1SyntaxType.Choice,
    tagClass: TagClass.Universal,
    numChoices: Object.keys(standard).length,
    keys: Object.keys(standard),
    extKeys: [] as string[],
    optional: false,
    extendable: false,
    defaultValue: undefined,
    standardItems: standard,
    extItems: {} as Record<string, Asn1Syntax>
  } as const
}

export function ChoiceExt<T extends Record<string, Asn1Syntax>, U extends Record<string, Asn1Syntax>>(standard: T, ext: U) {
  return {
    type: Asn1SyntaxType.Choice,
    tagClass: TagClass.Universal,
    numChoices: Object.keys(standard).length,
    keys: Object.keys(standard),
    extKeys: Object.keys(ext),
    optional: false,
    defaultValue: undefined,
    extendable: true,
    standardItems: standard,
    extItems: ext
  } as const
}

export function EnumerationValue<T extends string>(name: T, value: number) {
  return {
    type: Asn1SyntaxType.EnumerationValue,
    tagClass: TagClass.Universal,
    optional: false,
    defaultValue: undefined,
    extendable: false,
    value,
    name
  } as const
}

export function Enumeration<T extends Record<string, Asn1SyntaxEnumerationValue>>(standard: T, maxEnumValue?: number) {

  const keys = Object.keys(standard)

  return {
    type: Asn1SyntaxType.Enumeration,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Enumeration,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    standardItems: standard,
    extItems: {} as Record<string, Asn1SyntaxEnumerationValue>,
    maxEnumValue: (maxEnumValue != null ? maxEnumValue : standard[keys[keys.length - 1]].value) as number
  } as const
}

export function EnumerationExt<
  T extends Record<string, Asn1SyntaxEnumerationValue>,
  U extends Record<string, Asn1SyntaxEnumerationValue>
>(standard: T, ext: U, maxEnumValue?: number) {
  const keys = Object.keys(standard)
  return {
    type: Asn1SyntaxType.Enumeration,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Enumeration,
    optional: false,
    extendable: true,
    defaultValue: undefined,
    standardItems: standard,
    extItems: ext,
    maxEnumValue: (maxEnumValue != null ? maxEnumValue : standard[keys[keys.length - 1]].value) as number,
  } as const
}

export function Boolean() {
  return {
    type: Asn1SyntaxType.Boolean,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Boolean,
    optional: false,
    defaultValue: undefined,
    extendable: false
  } as const
}

export function Integer() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.Integer,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Integer,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    defaultValue: undefined,
    extendable: false,
    lowerLimit,
    upperLimit
  } as const
}

export function Null() {
  return {
    type: Asn1SyntaxType.Null,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Null,
    optional: false,
    defaultValue: undefined,
    extendable: false
  } as const
}

export function Real() {
  return {
    type: Asn1SyntaxType.Real,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Real,
    optional: false,
    defaultValue: undefined,
    extendable: false
  } as const
}

export function ObjectId() {
  return {
    type: Asn1SyntaxType.ObjectId,
    tagClass: TagClass.Universal,
    tag: UniversalTags.ObjectId,
    optional: false,
    defaultValue: undefined,
    extendable: false
  } as const
}

export function ObjectDescriptor() {
  return setCharSetBits({
    type: Asn1SyntaxType.ObjectDescriptor,
    tagClass: TagClass.Universal,
    tag: UniversalTags.ObjectDescriptor,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit: 0,
    upperLimit: UINT32_MAX,
    canonicalSet: '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007'
      + '\u0008\u0009\u000A\u000B\u000C\u000D\u000E\u000F'
      + '\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017'
      + '\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F'
      + ' !"#$%&\'()*+,-./0123456789:;<=>?'
      + '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'
      + '`abcdefghijklmnopqrstuvwxyz{|}~\u007f',
    canonicalSetBits: countBits(128),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function OctetString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.OctetString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.OctetString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    defaultValue: undefined,
    extendable: false,
    lowerLimit,
    upperLimit
  } as const
}

export function UTF8String() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.UTF8String,
    tagClass: TagClass.Universal,
    tag: UniversalTags.UTF8String,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    defaultValue: undefined,
    extendable: false,
    lowerLimit,
    upperLimit
  } as const
}

export function IA5String() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.IA5String,
    tagClass: TagClass.Universal,
    tag: UniversalTags.IA5String,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: '\u0000\u0001\u0002\u0003\u0004\u0005\u0006\u0007'
      + '\u0008\u0009\u000A\u000B\u000C\u000D\u000E\u000F'
      + '\u0010\u0011\u0012\u0013\u0014\u0015\u0016\u0017'
      + '\u0018\u0019\u001A\u001B\u001C\u001D\u001E\u001F'
      + ' !"#$%&\'()*+,-./0123456789:;<=>?'
      + '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'
      + '`abcdefghijklmnopqrstuvwxyz{|}~\u007f',
    canonicalSetBits: countBits(128),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function BMPString(
  firstChar: number = 0,
  lastChar: number = 0xffff,
  type: ConstraintType = ConstraintType.Unconstrained,
  charSet: string = ''
) {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  if (type === ConstraintType.Unconstrained) {
    firstChar = 0
    lastChar = 0xffff
    charSet = ''
  }

  let charSetUnalignedBits = countBits(lastChar - firstChar + 1)

  if (charSet) {
    let count = 0
    for (let i = 0; i < charSet.length; i++) {
      if (charSet.charCodeAt(i) >= firstChar && charSet.charCodeAt(i) <= lastChar) {
        count++
      }
    }
    count = countBits(count)
    if (charSetUnalignedBits > count) {
      charSetUnalignedBits = count
    }
  }

  let charSetAlignedBits = 1
  while (charSetUnalignedBits > charSetAlignedBits) {
    charSetAlignedBits <<= 1
  }

  return {
    type: Asn1SyntaxType.BMPString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.BMPString,
    constraint: type,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    firstChar,
    lastChar,
    charSetAlignedBits,
    charSetUnalignedBits,
    charSet
  } as const
}

export function GraphicString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.GeneralString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.GraphicString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: GeneralCharSet,
    canonicalSetBits: countBits(256),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function VisibleString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.VisibleString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.VisibleString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: ' !"#$%&\'()*+,-./0123456789:;<=>?'
      + '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'
      + '`abcdefghijklmnopqrstuvwxyz{|}~',
    canonicalSetBits: countBits(95),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function GeneralisedTime() {
  return setCharSetBits({
    type: Asn1SyntaxType.GeneralisedTime,
    tagClass: TagClass.Universal,
    tag: UniversalTags.GeneralisedTime,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit: 0,
    upperLimit: UINT32_MAX,
    canonicalSet: ' !"#$%&\'()*+,-./0123456789:;<=>?'
      + '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'
      + '`abcdefghijklmnopqrstuvwxyz{|}~',
    canonicalSetBits: countBits(95),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function UniversalTime() {
  return setCharSetBits({
    type: Asn1SyntaxType.UniversalTime,
    tagClass: TagClass.Universal,
    tag: UniversalTags.UniversalTime,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit: 0,
    upperLimit: UINT32_MAX,
    canonicalSet: ' !"#$%&\'()*+,-./0123456789:;<=>?'
      + '@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_'
      + '`abcdefghijklmnopqrstuvwxyz{|}~',
    canonicalSetBits: countBits(95),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function GeneralString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.GeneralString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.GeneralString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: GeneralCharSet,
    canonicalSetBits: countBits(256),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function UniversalString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.UniversalString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.UniversalString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit
  } as const
}

export function NumericString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.NumericString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.NumericString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: '0123456789',
    canonicalSetBits: countBits(10),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function PrintableString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return setCharSetBits({
    type: Asn1SyntaxType.PrintableString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.PrintableString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    canonicalSet: ' \'()+,-./0123456789:=?'
      + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
      + 'abcdefghijklmnopqrstuvwxyz',
    canonicalSetBits: countBits(74),
    charSet: '',
    charSetAlignedBits: 0,
    charSetUnalignedBits: 0
  } as const)
}

export function TeletexString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.TeletexString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.TeletexString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit
  } as const
}

export function VideotexString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.VideotexString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.VideotexString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit
  } as const
}

export function BitStringIndex<T extends string>(name: T, index: number) {
  return {
    type: Asn1SyntaxType.BitStringIndex,
    tagClass: TagClass.Universal,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    name,
    index
  } as const
}

export function BitString() {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.BitString,
    tagClass: TagClass.Universal,
    tag: UniversalTags.BitString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
  } as const
}

export function BitStringWithIndex<T extends Asn1SyntaxBitStringIndex[]>(indexes: T, ) {
  let lowerLimit = 0
  let upperLimit = UINT32_MAX
  return {
    type: Asn1SyntaxType.BitStringWithIndex,
    tagClass: TagClass.Universal,
    tag: UniversalTags.BitString,
    constraint: ConstraintType.Unconstrained,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    lowerLimit,
    upperLimit,
    indexes
  } as const
}

export function External<T extends Asn1Syntax>(encoding?: T) {
  return {
    type: Asn1SyntaxType.ExternalType,
    tagClass: TagClass.Universal,
    tag: UniversalTags.ExternalType,
    optional: false,
    extendable: false,
    defaultValue: undefined,
    sequence: Sequence({
      'direct-reference': Optional(ObjectId()),
      'indirect-reference': Optional(Integer()),
      'data-value-descriptor': Optional(ObjectDescriptor()),
      encoding: Choice({
        'single-ASN1-type': Tag(encoding, 0) as T,
        'octet-aligned': Tag(OctetString(), 1),
        'arbitrary': Tag(BitString(), 2)
      } as const)
    } as const)
  } as const
}

export function EmbeddedPDV() {
  return {
    type: Asn1SyntaxType.EmbeddedPDV,
    tagClass: TagClass.Universal,
    tag: UniversalTags.EmbeddedPDV,
    optional: false,
    extendable: false,
    defaultValue: undefined
  } as const
}

export function Any() {
  return {
    type: Asn1SyntaxType.Any,
    tagClass: TagClass.Universal,
    tag: UniversalTags.Private,
    optional: false,
    extendable: false,
    defaultValue: undefined
  } as const
}
