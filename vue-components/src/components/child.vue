<template>
  <div class="">
    <p>我是子类</p>
    <p>这是inject获取的值: {{ childFoo }}</p>
    <grand></grand>
  </div>
</template>

<script>
export default {
  components: {
    grand: () => import('./grand')
  },
  inject: { childFoo: { from: 'foo' } },
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
    console.log('child', this.$options);
  },
  methods: {

  }
}
</script>

<style scoped>
</style>
