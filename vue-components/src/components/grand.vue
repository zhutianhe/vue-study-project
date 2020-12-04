<template>
  <div class="">
    <p>我是孙类</p>
    <p>这是inject获取的值: {{ grandFoo }}</p>
  </div>
</template>

<script>
export default {
  components: {},
  inject: { grandFoo: { from: 'foo' } },
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
    console.log('grand', this.$options);
  },
  methods: {

  }
}
</script>

<style scoped>
</style>
