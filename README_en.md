ans1
======
English | [中文](README.md)

![](https://img.shields.io/badge/language-typescript-blue.svg) ![](https://img.shields.io/badge/platform-web%20|%20node-lightgrey.svg) ![license](https://img.shields.io/github/license/zhaohappy/asn1) [![npm](https://img.shields.io/npm/v/@libmedia/asn1.svg?style=flat)](https://www.npmjs.com/package/@libmedia/asn1)

### Introduction

asn1 is an asn1 syntax codec implementation that supports ber, der, and per.


### Start

#### install

```bash
npm install @libmedia/asn1
```

#### Defining asn1 syntax

```typescript

import { defined } from '@libmedia/asn1'

const Syntax = defined.Sequence({
  a: defined.Boolean(),
  b: defined.Integer(),
  c: defined.NumericString(),
  d: defined.BMPString(),
  e: defined.BitString(),
  g: defined.Enumeration({
    a: defined.EnumerationValue(0),
    b: defined.EnumerationValue(1),
  }),
  h: defined.ObjectId(),
  f: defined.Choice({
    a: defined.Tag(defined.Boolean(), 0),
    b: defined.Tag(defined.Integer(), 1)
  }),
  j: defined.Sequence({
    a: defined.Boolean(),
    b: defined.Integer()
  }),
  i: defined.Set({
    a: defined.Tag(defined.Boolean(), 0),
    b: defined.Tag(defined.Integer(), 1)
  }),
  k: defined.SequenceOf(defined.Sequence({
    a: defined.Boolean(),
    b: defined.Integer()
  })),
  n: defined.SetOf(defined.Set({
    a: defined.Tag(defined.Boolean(), 0),
    b: defined.Tag(defined.Integer(), 1)
  })),
  m: defined.SequenceExt({
    a: defined.Boolean(),
    b: defined.Integer()
  }, {
    c: defined.BMPString()
  }),
  q: defined.Null()
})

```

#### Encode

```typescript

import { BerEncoder } from '@libmedia/asn1'

const encoder = new BerEncoder()

const buffer = encoder.encode({
  a: true,
  b: 1,
  c: '123',
  d: '哈',
  e: '101',
  g: 1,
  h: '1.2.840.113549',
  f: {
    b: 3
  },
  j: {
    a: false,
    b: 4
  },
  i: {
    a: false,
    b: 6
  },
  k: [{
    a: true,
    b: 6
  }],
  n: [{
    a: true,
    b: 7
  }],
  m: {
    a: true,
    b: 8,
    c: '^_^'
  },
  q: null
}, Syntax)

```

#### Decode

```typescript

import { BerDecoder } from '@libmedia/asn1'

const decoder = new BerDecoder()

const result = decoder.decode(buffer, Syntax)

```

### CLI

You can use command line tools to quickly convert asn syntax definition files into ts files.

```shell
# global
asn1ts -i ./xxx.asn -o ./xxx.ts
# local
npx asn1ts -i ./xxx.asn -o ./xxx.ts
```

### License

[MIT](https://opensource.org/licenses/MIT)

