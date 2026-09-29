import { createApp, h, ref } from 'vue'
import App from './App.vue'
import PhotosByMonth from './PhotosByMonth.vue'
import '../src/styles/index.css'

// Two pages: the uniform grid (default) and "Photos by month" (#photos)
const page = ref(location.hash)
window.addEventListener('hashchange', () => {
  page.value = location.hash
})

createApp({
  render: () => (page.value === '#photos' ? h(PhotosByMonth) : h(App)),
}).mount('#app')
