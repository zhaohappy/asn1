
### 介绍

asn1 是一个 asn1 语法编解码实现，支持 ber、der、per。


### 使用

#### 定义 asn1 语法

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

#### 编码

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

#### 解码

```typescript

import { BerDecoder } from '@libmedia/asn1'

const decoder = new BerDecoder()

const result = decoder.decode(buffer, Syntax)

```

### CLI

你可以使用命令行工具将 asn 语法定义文件快速转换成使用 defined 定义的 ts 文件。

```shell
# 全局安装
asn1ts -i ./xxx.asn -o ./xxx.ts
# 本地安装
npx asn1ts -i ./xxx.asn -o ./xxx.ts
```

### 开源协议

[MIT](https://opensource.org/licenses/MIT)

