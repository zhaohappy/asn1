import { INT32_MAX, INT32_MIN } from './constant'

export type Data = Record<string | number | symbol, any>

export enum TagClass {
  Universal,
  Application,
  ContextSpecific,
  Private,
  Default
}

export enum TagType {
  Implicitly,
  Explicitly
}

export enum UniversalTags {
  Invalid,
  Boolean,
  Integer,
  BitString,
  OctetString,
  Null,
  ObjectId,
  ObjectDescriptor,
  ExternalType,
  Real,
  Enumeration,
  EmbeddedPDV,
  UTF8String,
  Sequence = 16,
  Set,
  NumericString,
  PrintableString,
  TeletexString,
  VideotexString,
  IA5String,
  UniversalTime,
  GeneralisedTime,
  GeneralizedTime = GeneralisedTime,
  GraphicString,
  VisibleString,
  GeneralString,
  UniversalString,
  BMPString = 30,
  Private
}

export enum ConstraintType {
  Unconstrained,
  Partially,
  Fixed,
  Extendable
}

export enum MinimumValueTag {
  MinimumValue = INT32_MIN
}

export enum MaximumValueTag {
  MaximumValue = INT32_MAX
}

export interface ConstrainedObject {
  constraint: ConstraintType
  lowerLimit: number
  upperLimit: number
}
