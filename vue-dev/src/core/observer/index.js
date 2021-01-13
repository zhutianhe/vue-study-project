/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
/**
 * 观察者的实例类
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  // 构造函数
  constructor (value: any) {
    this.value = value
    // 为什么在Observer里面声明一个dep?
    // object 里面有新增或者删除属性
    // array 中有变更方法，会根据这个dep强制更新
    this.dep = new Dep()
    this.vmCount = 0
    // 设置一个_ob_属性引用当前Observer实例
    def(value, '__ob__', this) // def方法保证不可枚举
    if (Array.isArray(value)) {
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods, arrayKeys)
      }
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  // 遍历对象的每一个属性并将它们转换为getter/setter
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
/**
 * 这个方法主要用data作为参数去实例化一个 Observer 对象实例，
 * Observer 是一个 Class，用于依赖收集和 notify 更新，
 * Observer 的构造函数使用 defineReactive 方法给对象的键响应式化，
 * 给对象的属性递归添加 getter/setter ，当data被取值的时候触发 getter 并搜集依赖，
 * 当被修改值的时候先触发 getter 再触发 setter 并派发更新
 * observe(data, true)
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果存在Observer实例则返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    // 不存在则返回新的Observer实例
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 响应化的执行函数
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep() // 在每个响应式键值的闭包中定义一个dep对象
  
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }
  // 如果之前该对象已经预设了getter/setter则将其缓存，新定义的getter/setter中会将其执行，保证不会覆盖之前已经定义的getter/setter。
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  // 属性拦截
  let childOb = !shallow && observe(val) // 只要是对象类型就会返回childOb
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    /**
     * getter 的时候进行依赖的收集，注意这里，只有在 Dep.target 中有值的时候才会进行依赖收集，
     * 这个 Dep.target 是在Watcher实例的 get 方法调用的时候 pushTarget 会把当前取值的watcher推入 Dep.target，
     * 原先的watcher压栈到 targetStack 栈中，当前取值的watcher取值结束后出栈并把原先的watcher值赋给 Dep.target，
     * cleanupDeps 最后把新的 newDeps 里已经没有的watcher清空，以防止视图上已经不需要的无用watcher触发
     */
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val // 如果原本对象拥有getter方法则执行
      if (Dep.target) { // 如果当前有watcher在读取当前值
        dep.depend() // 那么进行依赖收集，dep.addSub
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },

    /**
     * setter 的时候首先 getter，并且比对旧值没有变化则return，
     * 如果发生变更，则dep通知所有subs中存放的依赖本数据的Watcher实例 update 进行更新，
     * 这里 update 中会 queueWatcher( ) 异步推送到调度者观察者队列 queue 中，
     * 在nextTick时 flushSchedulerQueue( ) 把队列中的watcher取出来执行 watcher.run 且执行相关钩子函数 
     */
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val // 先getter
      /* eslint-disable no-self-compare */
      // 如果跟原来值一样则不管
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal) // 如果原本对象拥有setter方法则执行
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify() // 如果发生变更，则通知更新，调用watcher.update()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
