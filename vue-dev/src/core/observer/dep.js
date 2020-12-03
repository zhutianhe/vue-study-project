/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0 // Dep实例的id，为了方便去重

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
/**
 * 他是依赖收集的容器，或者称为依赖搜集器，他记录了哪些Watcher依赖自己的变化，
 * 或者说，哪些Watcher订阅了自己的变化；
 * 这里引用一个网友的发言：简单点说就是引用计数 ，谁借了我的钱，我就把那个人记下来，
 * 以后我的钱少了 我就通知他们说我没钱了,而把借钱的人记下来的小本本就是这里 Dep 实例里的subs
 */
export default class Dep {
  static target: ?Watcher; // 当前是谁在进行依赖的收集
  id: number;
  subs: Array<Watcher>; // 观察者集合

  constructor () {
    this.id = uid++ // Dep实例的id，为了方便去重
    this.subs = [] // 存储收集器中需要通知的Watcher
  }

  // 添加一个观察者对象
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 删除一个观察者对象
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 依赖收集 当存在Dep.target的时候把自己添加观察者的依赖中
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  // 通知所有的订阅者
  notify () {
    // stabilize the subscriber list first
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update() // watcher 实例通知更新
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
Dep.target = null
const targetStack = []  // watcher 栈
// 将watcher观察者实例设置给Dep.target，用以依赖收集。同时将该实例存入target栈中
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

/* 将观察者实例从target栈中取出并设置给Dep.target */
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
