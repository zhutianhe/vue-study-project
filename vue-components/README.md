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

**<font color=red>是不是很简单！[偷笑]</font>**

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

Vuex**集中式**存储管理应用的所有组件的状态，并以相应的规则保证状态以**可预测**的方式发生变化。

<img src="/Users/zth/Library/Application Support/typora-user-images/image-20201208092712388.png" alt="image-20201208092712388" style="zoom:50%;" />

我们先看看如果使用vuex，

- 第一步：定义一个Store

  ```js
  // store/index.js
  import Vue from 'vue'
  import Vuex from 'vuex'
  
  Vue.use(Vuex)
  
  export default = new Vuex.Store({
    state: {
      counter: 0
    },
    getters: {
      doubleCounter(state) {
        return state.counter * 2
      }
    },
    mutations: {
      add(state) {
        state.counter ++ 
      }
    },
    actions: {
      add({commit}) {
        setTimeout(() => {
          commit('add')
        }, 1000);
      }
    }
  })
  ```

- 第二步，挂载app

  ```js
  // main.js
  import vue from 'vue'
  import App form './App.vue'
  import store from './store'
  
  new Vue({
    store,
    render: h => h(App)
  }).$mount('#app')
  ```

- 第三步：状态调用

  ```js
  // test.vue
  <p @click="$store.commit('add')">counter: {{ $store.state.counter }}</p>
  <p @click="$store.dispatch('add')">async counter: {{ $store.state.counter }}</p>
  <p>double counter: {{ $store.getters.doubleCounter }}</p>
  ```

从上面的例子，我们可以看出，vuex需要具备这么几个特点：

1. 使用Vuex只需执行 `Vue.use(Vuex)`，保证vuex是以插件的形式被vue加载。
2. state的数据具有响应式，A组件中修改了，B组件中可用修改后的值。
3. getters可以对state的数据做动态派生。
4. mutations中的方法是同步修改。
5. actions中的方法是异步修改。

那我们今天就去源码里探索以下，vuex是怎么实现的，又是怎么解决以上的问题的！

#### 问题1：vuex的插件加载机制

所谓插件机制，就是需要实现Install方法，并且通过`mixin`形式混入到Vue的生命周期中，我们先来看看Vuex的定义

- 需要对外暴露一个对象，这样就可以满足` new Vuex.Store()`

  ```js
  // src/index.js  
  import { Store, install } from './store'
  import { mapState, mapMutations, mapGetters, mapActions, createNamespacedHelpers } from './helpers'
  
  export default {
    Store,
    install,
    version: '__VERSION__',
    mapState,
    mapMutations,
    mapGetters,
    mapActions,
    createNamespacedHelpers
  }
  ```

- 其次是定义store，并且实现vue的Install方法

  ```js
  // src/store.js
  let Vue // bind on install
  
  export class Store {
   ......
  }
  
  // 实现的Install方法 
  export function install (_Vue) {
    if (Vue && _Vue === Vue) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[vuex] already installed. Vue.use(Vuex) should be called only once.'
        )
      }
      return
    }
    Vue = _Vue
    applyMixin(Vue)
  }
  ```

#### 问题2：state的数据响应式

看懂了Vuex的入口定义，下面我们就针对store的定义来一探究竟，先看看state的实现

```js
// src/store.js
export class Store {
  constructor(options = {}) {
    ......
    
    // strict mode
    this.strict = strict

    const state = this._modules.root.state

    // initialize the store vm, which is responsible for the reactivity
    // (also registers _wrappedGetters as computed properties)
    // 看上面的注释可以得知，resetStoreVM就是初始化store中负责响应式的vm的方法，而且还注册所有的gettersz作为vm的计算属性
    resetStoreVM(this, state)
  }
}
```

我们来看看resetStoreVM的具体实现

```js
// src/store.js
function resetStoreVM (store, state, hot) {
  const oldVm = store._vm

  // bind store public getters
  store.getters = {}
  // reset local getters cache
  store._makeLocalGettersCache = Object.create(null)
  const wrappedGetters = store._wrappedGetters
  const computed = {}
  // 这里是实现getters的派生
  forEachValue(wrappedGetters, (fn, key) => {
    // use computed to leverage its lazy-caching mechanism
    // direct inline function use will lead to closure preserving oldVm.
    // using partial to return function with only arguments preserved in closure environment.
    computed[key] = partial(fn, store)
    Object.defineProperty(store.getters, key, {
      get: () => store._vm[key],
      enumerable: true // for local getters
    })
  })

  // use a Vue instance to store the state tree
  // suppress warnings just in case the user has added
  // some funky global mixins
  // 这是是通过new一个Vue实例，并将state作为实例的datas属性，那他自然而然就具有了响应式
  const silent = Vue.config.silent
  Vue.config.silent = true
  store._vm = new Vue({
    data: {
      $$state: state
    },
    computed
  })
  Vue.config.silent = silent

  // enable strict mode for new vm
  if (store.strict) {
    enableStrictMode(store)
  }

  if (oldVm) {
    if (hot) {
      // dispatch changes in all subscribed watchers
      // to force getter re-evaluation for hot reloading.
      store._withCommit(() => {
        oldVm._data.$$state = null
      })
    }
    Vue.nextTick(() => oldVm.$destroy())
  }
}
```

#### 问题3：getters实现state中的数据的派生

关于getters的实现，我们在上面也做了相应的解释，实际上就是将getters的方法包装一层后，收集到computed对象中，并使用Object.defineProperty注册store.getters，使得每次取值时，从store._vm中取。

**关键的步骤就是创建一个Vue的实例**

```js
store._vm = new Vue({
  data: {
    $$state: state // 这是store中的所有state
  },
  computed // 这是store中的所有getters
})
```

#### 问题4：mutations中同步commit

```js
// src/store.js
// store的构造函数
constructor(options = {}) {
  // 首先在构造方法中，把store中的commit和dispatch绑定到自己的实例上，
  // 为什么要这么做呢？
  // 是因为在commit或者dispatch时，尤其是dispatch，执行function时会调用实例this，而方法体内的this是具有作用域属性的，所以如果要保证每次this都代表store实例，就需要重新绑定一下。
  const store = this
  const { dispatch, commit } = this
  this.dispatch = function boundDispatch (type, payload) {
    return dispatch.call(store, type, payload)
  }
  this.commit = function boundCommit (type, payload, options) {
    return commit.call(store, type, payload, options)
  }
}

// commit 的实现
commit (_type, _payload, _options) {
  // check object-style commit
  const {
    type,
    payload,
    options
  } = unifyObjectStyle(_type, _payload, _options)

  const mutation = { type, payload }
  // 通过传入的类型，查找到mutations中的对应的入口函数
  const entry = this._mutations[type]
  ......
  // 这里是执行的主方法，通过遍历入口函数，并传参执行
  this._withCommit(() => {
    entry.forEach(function commitIterator (handler) {
      handler(payload)
    })
  })
	......
}
```

#### 问题5：actions中的异步dispatch

上面说了在构造store时绑定dispatch的原因，下面我们就继续看看dispatch的具体实现。

```js
// src/store.js
// dispatch 的实现
dispatch (_type, _payload) {
  // check object-style dispatch
  const {
    type,
    payload
  } = unifyObjectStyle(_type, _payload)

  const action = { type, payload }
  
  // 同样的道理，通过type获取actions中的入口函数
  const entry = this._actions[type]
  
 	······
  
  // 由于action是异步函数的集合，这里就用到了Promise.all，来合并多个promise方法并执行
  const result = entry.length > 1
  ? Promise.all(entry.map(handler => handler(payload)))
  : entry[0](payload)
	
  return result.then(res => {
    try {
      this._actionSubscribers
        .filter(sub => sub.after)
        .forEach(sub => sub.after(action, this.state))
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[vuex] error in after action subscribers: `)
        console.error(e)
      }
    }
    return res
  })
}
```

到这里，我们就把整个store中状态存储和状态变更的流程系统的串联了一遍，让我们对Vuex内部的机智有个简单的认识，最后我们根据我们对Vuex的理解来实现一个简单的Vuex。

```js
// store.js
let Vue

// 定义store类
class Store{
  constructor(options = {}) {
    this.$options = options
    this._mutations = options.mutations
    this._actions = options.actions
  	this._wrappedGetters = options.getters
    
    
    // 定义computed
    const computed = {}
    this.getters = {}
    const store = this
    Object.keys(this._wrappedGetters).forEach(key => {
      // 获取用户定义的getters
      const fn = store._wrappedGetters[key]
      
      // 转换为computed可以使用无参数形式
      computed[key] = function() {
        return fn(store.state)
      }
      
      // 为getters定义只读属性
      Object.defineProperty(store.getters, key {
      	get:() => store._vm[key]
    	})
    })
    
    // state的响应式实现
    this._vm = new Vue({
      data: {
        // 加两个$，Vue不做代理
        $$state: options.state
      },
      computed // 添加计算属性
    })
  
    this.commit = this.commit.bind(this)
    this.dispatch = this.dispatch.bind(this)
  }
  
  // 存取器，获取store.state ，只通过get形式获取，而不是直接this.xxx, 达到对state
  get state() {
    return this._vm._data.$$state
  }
	
	set state(v) {
    // 如果用户不通过commit方式来改变state，就可以在这里做一控制
  }

  // commit的实现
  commit(type, payload) {
    const entry = this._mutations[type]
    if (entry) {
      entry(this.state, payload)
    }
  }
  
  // dispatch的实现
 	dispatch(type, payload) {
    const entry = this._actions[type]
    if (entry) {
      entry(this, payload)
    }
  }  
}

// 实现install
function install(_Vue) {
  Vue = _Vue
  Vue.mixin({
    beforeCreate() {
      if (this.$options.store) {
      	Vue.prototype.$Store = this.$options.store // 这样就可以使用 this.$store
      }
    }
  })
}

// 导出Vuex对象
export default {
  Store,
  install
}

```



### \$parent / $root
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



说到这里，我们应该知道了provide/inject之间的调用逻辑了吧。最后，我们在用一句话总结一下：

当祖先组件在初始化时，vue首先会通过mergeOptions方法将组件中provide配置项合并vm.$options中，并通过mergeDataOrFn将provide的值放入当前实例的`_provided`中，此时当子孙组件在初始化时，也会通过合并的options解析出当前组件所定义的inject，并通过网上逐级遍历查找的方式，在祖先实例的`-provided`中找到对应的value值







全部文章链接

[Vue组件通信原理剖析（一）事件总线的基石 $on和$emit](https://blog.csdn.net/u013205165/article/details/110952379)

[Vue组件通信原理剖析（二）全局状态管理Vuex](https://blog.csdn.net/u013205165/article/details/110952879)

[Vue组件通信原理剖析（三）provide/inject原理分析](https://blog.csdn.net/u013205165/article/details/110953064)

最后喜欢我的小伙伴也可以通过关注公众号“剑指大前端”，或者扫描下方二维码联系到我，进行经验交流和分享，同时我也会定期分享一些大前端干货，让我们的开发从此不迷路。
![在这里插入图片描述](https://img-blog.csdnimg.cn/20201119095922148.png?x-oss-process=image/watermark,type_ZmFuZ3poZW5naGVpdGk,shadow_10,text_aHR0cHM6Ly9ibG9nLmNzZG4ubmV0L3UwMTMyMDUxNjU=,size_16,color_FFFFFF,t_70#pic_center)




