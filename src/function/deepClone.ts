export default function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  // 处理 Date 类型
  if (obj instanceof Date) {
    return new Date(obj)
  }

  // 处理数组类型
  if (Array.isArray(obj)) {
    let arrCopy = []
    for (let i = 0; i < obj.length; i++) {
      arrCopy[i] = deepClone(obj[i])
    }
    return arrCopy
  }

  // 处理对象类型
  let objCopy = {}
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      objCopy[key] = deepClone(obj[key])
    }
  }
  return objCopy
}
