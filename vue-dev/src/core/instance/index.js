import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 定义vue的方法
function Vue(options) {
  // if (process.env.NODE_ENV !== 'production' &&
  //   !(this instanceof Vue)
  // ) {
  //   warn('Vue is a constructor and should be called with the `new` keyword')
  // }

  // 执行init函数
  this._init(options)
}

// 5个扩展函数
// initMixin就做了一件事情，在Vue的原型上增加_init方法，构造Vue实例的时候会调用这个_init方法来初始化Vue实例
initMixin(Vue)
// stateMixin中主要声明了Vue.prototype.$data、$props、$set、$watch
stateMixin(Vue)
// eventsMixin主要定义了Vue.prototype.$emit/$on/$off/$once，
// 原理就是利用观察者模型，为每一个event维护一个观察队列，存放在Vue._events中
eventsMixin(Vue)
// lifecycleMixin中定义了我们Vue中经常用到的Vue.prototype._update/$forceUpdate/$destory方法，
// 每当我们定义的组件data发生变化或其他原因需要重新渲染时，Vue会调用该方法，对Vnode做diff和patch操作
lifecycleMixin(Vue)
// renderMixin中定义了Vue.prototype._render/$nextTick等方法，_render()调用实例化时传入的render方法，生成VNode。
// 经常与Vue.prototype.update一起使用 
renderMixin(Vue)

export default Vue
