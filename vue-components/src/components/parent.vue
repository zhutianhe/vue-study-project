<!--  -->
<template>
  <div class="">
    <p>我是父类</p>
    <child></child>
  </div>
</template>

<script>
export default {
  components: {
    child: () => import('./child')
  },
  provide: {
    foo: '我是祖先类定义provide'
  },
  props: {

  },
  data() {
    return {

    }
  },
  computed: {

  },
  watch: {

  },
  created() {

  },
  mounted() {
    console.log('parent', this.$options);
  },
  methods: {

  }
}
</script>

<style scoped>
</style>
