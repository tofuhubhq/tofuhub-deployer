<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const HOST =
  import.meta.env.DEV
    ? 'localhost:80'
    : window.location.host

const WS_HOST = `ws://${HOST}`

const logs = ref('')
let socket: WebSocket | null = null

onMounted(() => {
  socket = new WebSocket(`${WS_HOST}/logs`)

  socket.onmessage = (event) => {
    logs.value += event.data
    nextTick(() => {
      const el = document.getElementById('log-output')
      if (el) el.scrollTop = el.scrollHeight
    })
  }

  socket.onerror = (e) => {
    logs.value += '\n[WebSocket error]'
    console.error('WebSocket error', e)
  }

  socket.onclose = () => {
    logs.value += '\n[WebSocket connection closed]'
  }
})

onBeforeUnmount(() => {
  if (socket) socket.close()
})
</script>

<template>
  <div class="container">
    <h2>Logs</h2>
    <pre
      id="log-output"
      style="
        margin-top: 1rem;
        background: #111;
        color: #0f0;
        padding: 1rem;
        max-height: 300px;
        overflow-y: auto;
        font-family: monospace;
        font-size: 13px;
        border-radius: 6px;
        border: 1px solid #444;
      "
    >{{ logs }}</pre>
  </div>
</template>

<style scoped>
.container {
  padding:10px;
}
</style>