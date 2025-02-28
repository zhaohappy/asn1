
### 介绍

asn1 是一个 asn1 语法编解码实现，支持 ber、der、per。


### 使用

#### 定义 asn1 语法

```typescript

import { defined } from '../src/index'

const Syntax = defined.Sequence({
  a: defined.Boolean(),
  b: defined.Integer(),
  c: defined.NumericString(),
  d: defined.BMPString(),
  e: defined.BitString(),
  g: defined.Enumeration({
    a: defined.EnumerationValue('a', 0),
    b: defined.EnumerationValue('b', 1),
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

#### 编码

```typescript

import { BerEncoder } from '../src/index'

const encoder = new BerEncoder()

const data: Asn1Syntax2Value<typeof Syntax> = {
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
}
const buffer = encoder.encode(data, Syntax)

```

#### 解码

```typescript

import { BerDecoder } from '../src/index'

const decoder = new BerDecoder()

const result = decoder.decode(buffer, Syntax)

```

### 开源协议

[MIT](https://opensource.org/licenses/MIT)

版权所有 (C) 2024-现在 赵高兴

Copyright (C) 2024-present, Gaoxing Zhao
