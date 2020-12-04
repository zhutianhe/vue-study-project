# vue-components

## Project setup
```
npm install
```

### Compiles and hot-reloads for development
```
npm run serve
```

### Compiles and minifies for production
```
npm run build
```

### Lints and fixes files
```
npm run lint
```

### Customize configuration
See [Configuration Reference](https://cli.vuejs.org/config/).


## 组件通信  communication

组件通信的常用方式
  props
  自定义事件
  eventbus
  vuex

  - 边界情况
    - $parent
    - $children
    - $root
    - $refs
    - provide/inject
  - 非props特性
    - $attrs
    - $listeners

 ### props 
解决问题：父给子传值
 ```js
 // child
 props: {
   msg: {
     type: String,
     default: ''
   }
 }

 // parent
 <child msg="这是传给子组件的参数"></child>
 ```

### 自定义事件 
解决问题：子给父传值
```js
// child
this.$emit('add', '这是子组件传给父组件的参数')

// parent
// parantAdd是定义在父组件中的事件，事件接受的参数$event就是子组件传给父组件的值
<child @add="parentAdd($event)"></child>
```

### 事件总线eventbus
解决问题：任意两个组件之间的传值
```js
// 通常我们的做法是这样的
// main.js 
Vue.prototype.$bus = new Vue()

// child1
this.$bus.$on('foo', handle)

// child2
this.$bus.$meit('foo')
```
那么组件之间的通信到底是怎么实现的呢？$on和$emit具体是怎么实现的？我们去源码中找一找答案，let's go!

```js
// $on 的实现逻辑
Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
    }
    return vm
  }

// $emit 的实现逻辑
Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }

// invokeWithErrorHandling 的实现逻辑
export function invokeWithErrorHandling (
  handler: Function,
  context: any,
  args: null | any[],
  vm: any,
  info: string
) {
  let res
  try {
    res = args ? handler.apply(context, args) : handler.call(context)
  } catch (e) {
    handleError(e, vm, info)
  }
  return res
}
```
上面就是我们在源码中找到的实现，其中有一些调试代码我已经删除掉，方便大家可以抓住重点！
下面我们来一一分析
1. 首先我们都了解vue的数据相应是依赖于“观察-订阅”模式，那$on、$emit也不例外;
2. $on用来收集所有的事件依赖，他会将传入的参数`event`和`fn`作为key和value的形式存到`vm._events`这个事件集合里，就像这样`vm._events[event]=[fn]`;
3. 而$emit是用来触发事件的，他会根据传入的`event`在`vm_events`中找到对应的事件并执行`invokeWithErrorHandling(cbs[i], vm, args, vm, info)`
4. 最后我们看invokeWithErrorHandling方法可以发现，他是通过`handler.apply(context, args)`和`handler.call(context)`的形式执行对应的方法

#### <font color=red>是不是很简单！[偷笑]</font>

我们既然知道怎么实现的，那么我们就可以自定义实现一个Bus, 看代码

```js
// Bus： 事件派发、监听和回调
class Bus {
  constructor() {
    this.callbacks = {}
  }

  // 收集监听的回调函数
  $on(name, fn) {
    this.callbacks[name] = this.callbacks[name] || []
    this.callbacks[name].push(fn)
  }

  // 执行监听的回调函数
  $emit(name, args) {
    if (this.callbacks[name]) {
      this.callbacks[name].forEach(cb => cb(args))
    }
  }
}

// 在main.js中这样使用
Vue.prototype.$bus = new Bus()

```

### vuex

### $parent / $root
解决问题：具有相同父类或者相同根元素的组件

```js
// parant 
<child1></child1> 
<child2></child2>

// child1
this.$parent.$on('foo', handle)

// child2
this.$parent.$meit('foo')

```


### $children
解决问题：父组件访问子组件实现父子通信

```js
// parent
this.$children[0].childMethod = '父组件调用子组件方法的输出'
```
> 注意： $children是不能保证子元素的顺序


### \$attrs/$listeners
\$attrs 包含了父作用域中不作为prop被识别且获取的特性绑定属性（class/style除外），如果子组件没声明prop，则包含除clas、style外的所有属性，并且在子组件中可以通过`v-bind="$attrs"`传入内部组件

```js
// parent
<child foo="foo"></child>

// child
<p>{{ $attrs.foo }}</p>

```

\$listeners
包含了父作用域中的 (不含`.native`修饰器的)`v-on`事件监听器。它可以通过`v-on="$listeners"`传入内部组件在创建更高层次的组件时非常有用。
简单点讲它是一个对象，里面包含了作用在这个组件上所有的监听器（监听事件），可以通过`v-on="$listeners"`将事件监听指向这个组件内的子元素（包括内部的子组件）。
为了查看方便，我们设置`inheritAttrs: true,后面补充一下inheritAttrs。

```js
// parent
<child @click="onclick"></child>

// child 
// $listeners会被展开并监听
<p v-on="$listeners"></p>
```

### refs
解决问题：父组件访问子组件实现父子通信，和$children类似

```js
// parent
<child ref="children"></child>

mounted() {
  this.$refs.children.childMethod = '父组件调用子组件的输出'
}

```

### provide/inject
解决问题：能够实现祖先和后代之间的传值 

```js
// ancestor
provide() {
  return {foo: 'foo'}
}

// descendent
inject: ['foo']
```

那么问题来了，这个数据通信是什么样的机制呢？
我们先来看一个列子
```js
// parent 父类
<template>
  <div class="">
    <p>我是父类</p>
    <child></child>
  </div>
</template>

export default {
  components: {
    child: () => import('./child')
  },
  provide: {
    foo: '我是祖先类定义provide'
  },
}

// child 子类
<template>
  <div class="">
    <p>我是子类</p>
    <p>这是inject获取的值: {{ childFoo }}</p>
    <grand></grand>
  </div>
</template>
export default {
  components: {
    grand: () => import('./grand')
  },
  inject: { childFoo: { from: 'foo' } },
}

// grand 孙类
<template>
  <div class="">
    <p>我是孙类</p>
    <p>这是inject获取的值: {{ grandFoo }}</p>
  </div>
</template>
export default {
  components: {},
  inject: { grandFoo: { from: 'foo' } },
}
```

下面我结合上面的示例和源码一步一步分析一下：
1. 先说说provide是怎么定义参数的，源码走起
   
   ```js
   // 初始化Provide的实现
   export function initProvide (vm: Component) {
     const provide = vm.$options.provide
     if (provide) {
       vm._provided = typeof provide === 'function'
         ? provide.call(vm)
         : provide
     }
   }
   
   // vm.$options是怎么来的，是通过mergeOpitions得到的
   if (options && options._isComponent) {
     // optimize internal component instantiation
     // since dynamic options merging is pretty slow, and none of the
     // internal component options needs special treatment.
     initInternalComponent(vm, options);
   } else {
     vm.$options = mergeOptions(
       resolveConstructorOptions(vm.constructor),
       options || {},
       vm
     );
   }
   
   // 我们在看看mergeOptions的实现
   const options = {}
   let key
   for (key in parent) {
     mergeField(key)
   }
   for (key in child) {
     if (!hasOwn(parent, key)) {
       mergeField(key)
     }
   }
   function mergeField (key) {
     const strat = strats[key] || defaultStrat
     options[key] = strat(parent[key], child[key], vm, key)
   }
   return options
   
   // 找到strat方法的实现
   strats.provide = mergeDataOrFn;
   
   export function mergeDataOrFn (
     parentVal: any,
     childVal: any,
     vm?: Component
   ): ?Function {
     if (!vm) {
       // in a Vue.extend merge, both should be functions
       if (!childVal) {
         return parentVal
       }
       if (!parentVal) {
         return childVal
       }
       return function mergedDataFn () {
         return mergeData(
           typeof childVal === 'function' ? childVal.call(this, this) : childVal,
           typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
         )
       }
     } else {
       return function mergedInstanceDataFn () {
         // instance merge
         const instanceData = typeof childVal === 'function'
           ? childVal.call(vm, vm)
           : childVal
         const defaultData = typeof parentVal === 'function'
           ? parentVal.call(vm, vm)
           : parentVal
         if (instanceData) {
           return mergeData(instanceData, defaultData)
         } else {
           return defaultData
         }
       }
     }
   }
   
   ```
   
   从上面的逻辑可以看出，在组件初始化时，会将`vm.$options.provide`这个函数赋值给provide，并把调用该函数得到的结果赋值给`vm._provided`，那么就会得到`vm._provided = { foo: "我是祖先类定义provide" }`
   
   
   
2. 不要停，我们继续探究一下子孙组件中的inject是怎么实现的，上源码

   ```js
   // 首先，初始化inject
   export function initInjections (vm: Component) {
     const result = resolveInject(vm.$options.inject, vm)
     if (result) {
       toggleObserving(false)
       Object.keys(result).forEach(key => {
         /* istanbul ignore else */
         if (process.env.NODE_ENV !== 'production') {
           defineReactive(vm, key, result[key], () => {
             warn(
               `Avoid mutating an injected value directly since the changes will be ` +
               `overwritten whenever the provided component re-renders. ` +
               `injection being mutated: "${key}"`,
               vm
             )
           })
         } else {
           defineReactive(vm, key, result[key])
         }
       })
       toggleObserving(true)
     }
   }
   
   // 初始化的inject实际上是resolveInject的结果，下面我们看看resolve都有哪些操作
   // 第一步：获取组件中定义的inject的key值，然后进行遍历
   // 第二步：根据key值获取对应的在provide中定义的provideKey，就比如上面的根据"childFoo"获取到"foo"
   // 第三步：通过source = source.$parent逐级往上循环在_provided中查找对应的provideKey
   // 第四步：如果找到，将实际的key值作为键，source._provided[provideKey]作为值，存为一个对象，当作这个函数的结果
   export function resolveInject (inject: any, vm: Component): ?Object {
     if (inject) {
       // inject is :any because flow is not smart enough to figure out cached
       const result = Object.create(null)
       const keys = hasSymbol
         ? Reflect.ownKeys(inject)
         : Object.keys(inject)
   
       for (let i = 0; i < keys.length; i++) {
         const key = keys[i]
         // #6574 in case the inject object is observed...
         if (key === '__ob__') continue
         const provideKey = inject[key].from
         let source = vm
         while (source) {
           if (source._provided && hasOwn(source._provided, provideKey)) {
             result[key] = source._provided[provideKey]
             break
           }
           source = source.$parent
         }
         if (!source) {
           if ('default' in inject[key]) {
             const provideDefault = inject[key].default
             result[key] = typeof provideDefault === 'function'
               ? provideDefault.call(vm)
               : provideDefault
           } else if (process.env.NODE_ENV !== 'production') {
             warn(`Injection "${key}" not found`, vm)
           }
         }
       }
       return result
     }
   }
   ```



说到这里，我们应该知道了provide/inject之间的调用逻辑了吧，最后，我们在用一句话总结一下：

当祖先组件在初始化时，vue首先会通过mergeOptions方法将组件中provide配置项合并vm.$options中，并通过mergeDataOrFn将provide的值放入当前实例的`_provided`中，此时当子孙组件在初始化时，也会通过合并的options解析出当前组件所定义的inject，并通过网上逐级遍历查找的方式，在祖先实例的`-provided`中找到对应的value值










