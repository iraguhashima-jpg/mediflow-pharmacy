<template>
  <section class="nf">
    <h1>404</h1>
    <p>That page doesn't exist.</p>
    <router-link to="/" class="primary">Back to home</router-link>
  </section>
</template>

<style scoped>
.nf {
  min-height: 100vh; display: grid; place-items: center; text-align: center; gap: 12px;
  background: #f5f8fa; color: #1c3a4c; padding: 24px;
}
.nf h1 { font: 800 60px Manrope, sans-serif; margin: 0; color: #0a927b; }
.nf p { font-size: 15px; color: #5a6c78; margin: 0 0 12px; }
.nf .primary { text-decoration: none; display: inline-block; }
</style>
