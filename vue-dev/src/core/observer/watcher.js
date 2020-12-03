/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
/* 一个解析表达式，进行依赖收集的观察者，同时在表达式数据变更时触发回调函数。它被用于$watch api以及指令 */
/*
watcher 有下面几种使用场景：
render watcher 渲染 watcher，渲染视图用的 watcher
computed watcher 计算属性 watcher，因为计算属性即依赖别人也被人依赖，因此也会持有一个 Dep 实例
watch watcher 侦听器 watcher
只要会被别的观察者 (watchers) 依赖，比如data、data的属性、计算属性、props，
就会在闭包里生成一个 Dep 的实例 dep 并在被调用 getter 的时候 dep.depend 收集它被谁依赖了，
并把被依赖的watcher存放到自己的subs中 this.subs.push(sub)，
以便在自身改变的时候通知 notify 存放在 dep.subs 数组中依赖自己的 watchers 自己改变了，请及时 update ~
只要依赖别的响应式化对象的对象，都会生成一个观察者 watcher ，
用来统计这个 watcher 依赖了哪些响应式对象，在这个 watcher 求值前把当前 watcher 设置到全局 Dep.target，
并在自己依赖的响应式对象发生改变的时候及时 update
*/
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean // 是否是渲染watcher的标志位
  ) {
    this.vm = vm
    if (isRenderWatcher) {
      vm._watcher = this
    }
    vm._watchers.push(this)
    // options
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    // 在get方法中执行
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn  
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = noop
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 获得getter的值并且重新进行依赖收集
   */
  /**
   * get 方法中执行的 getter 就是在一开始new渲染watcher时传入的 
   * updateComponent = () => { vm._update(vm._render(), hydrating) }，
   * 这个方法首先 vm._render() 生成渲染VNode树，在这个过程中完成对当前Vue实例 vm 上的数据访问，
   * 触发相应一众响应式对象的 getter，然后 vm._update() 去 patch
   * 
   * 注意这里的 get 方法最后执行了 getAndInvoke，这个方法首先遍历watcher中存的 deps，
   * 移除 newDep 中已经没有的订阅，然后 depIds = newDepIds; deps = newDeps ，
   * 把 newDepIds 和 newDeps 清空。每次添加完新的订阅后移除旧的已经不需要的订阅，这样在某些情况，
   * 比如 v-if 已不需要的模板依赖的数据发生变化时就不会通知watcher去 update 了
   */
  get () {
    pushTarget(this)  // 设置Dep.target = this
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget() // 将观察者实例从target栈中取出并设置给Dep.target
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  /* 添加一个依赖关系到Deps集合中 */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  /* 清理newDeps里没有的无用watcher依赖 */
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  /* 调度者接口，当依赖发生改变的时候进行回调 */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  /* 调度者工作接口，将被调度者回调 */
  run () {
    if (this.active) {
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  /* 收集该watcher的所有deps依赖 */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  /* 收集该watcher的所有deps依赖，只有计算属性使用 */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  /* 将自身从所有依赖收集订阅列表删除 */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
