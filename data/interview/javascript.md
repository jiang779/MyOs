---
type: JavaScript 核心
---

## Promise & 异步

- Promise 三种状态分别是什么，状态流转规则？
- Promise.then/catch/finally 返回值规则是什么？
- Promise.all、Promise.race、Promise.allSettled、Promise.any 各自作用、失败策略？
- 手写简易版 Promise（实现状态、then 链式调用）
- 手写 Promise.all
- 手写 Promise.race
- 手写 Promise.allSettled
- 手写 Promise.any
- 手写 sleep 延迟函数，基于 Promise 实现
- Promise 链式调用，多个.then 执行顺序，抛出错误如何穿透？
- 什么是 Promise 回调地狱，async/await 如何解决回调地狱？
- async await 底层原理，是语法糖吗？await 后面接 Promise 和普通值分别什么表现？
- async 函数如果不写 await，返回值是什么？
- await 报错，不写 try-catch 会发生什么，有哪些捕获异常方案？

## 事件循环 宏任务 & 微任务

- JS 为什么是单线程？什么是事件循环 EventLoop？浏览器 EventLoop 完整流程
- 宏任务有哪些？微任务有哪些？优先级顺序？
- setTimeout、setInterval、script 整体代码、Promise.then、queueMicrotask、MutationObserver 分别属于什么任务？
- 出一段混合 setTimeout + Promise + async await 的代码，描述输出顺序（面试现场手写推演）
- Node 和浏览器事件循环的区别
- setTimeout 不准时的原因是什么？
- queueMicrotask 使用场景，和 Promise.then 对比

## 原型、原型链、this 指向

- prototype、__proto__、constructor 三者关系
- 原型链查找规则，属性查找过程
- new 操作符执行哪几步？手写 new
- this 指向的 5 种场景：普通函数、对象方法、call/apply/bind、箭头函数、class
- 箭头函数有没有 this、arguments、prototype？
- call、apply、bind 区别，手写 bind
- 继承实现方式：ES5 组合继承、寄生组合继承、ES6 class 继承原理
- instanceof 原理，手写 instanceof
- typeof 和 instanceof 区别

## 闭包、作用域

- 什么是闭包，闭包产生条件，闭包的优缺点
- 什么是作用域、作用域链，变量提升
- var/let/const 的区别，暂时性死区 TDZ
- 垃圾回收机制，标记清除，闭包如何造成内存泄漏，怎么避免

## 数组、手写工具函数

- 手写数组 map
- 手写数组 filter
- 手写数组 reduce
- 手写防抖 debounce
- 手写节流 throttle，讲防抖节流应用场景
- 手写深拷贝（基础版，考虑循环引用）
- 数组 flat 扁平化实现
- 数组去重多种实现方式
- 手写柯里化函数 curry
- 手写函数组合 compose
- 实现发布订阅模式 EventEmitter

## JS 其他高频

- 0.1+0.2 !== 0.3 原因，怎么解决浮点数精度
- == 和 === 区别，讲隐式类型转换规则
- Symbol 作用，使用场景
- Map 和 Object 区别；Set 使用场景
- WeakMap WeakSet 特点，弱引用是什么，有什么用处
- for...in 和 for...of 区别
- 什么是迭代器 Iterator，可迭代对象有哪些
- 箭头函数和普通函数的区别
