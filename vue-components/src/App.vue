<template>
  <div id="app">
    <img alt="Vue logo" src="./assets/logo.png" />
    <!-- <HelloWorld msg="Welcome to Your Vue.js App" /> -->
    <!-- <parent></parent> -->
    <vuexTest></vuexTest>
  </div>
</template>

<script>
// import parent from './components/parent'
import vuexTest from './components/vuex-test'

export default {
  name: 'App',
  components: {
    // parent,
    vuexTest
  },
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
