<template>
  <aside class="sidebar">
    <button v-for="tab in tabs" :key="tab" @click="$emit('updateTab', tab)" :class="{ active: tab === activeTab }">
      {{ tab }}
    </button>
  </aside>
</template>

<script setup lang="ts">
defineProps<{ activeTab: string }>()
defineEmits(['updateTab'])

const tabs = ['Inputs', 'Architecture', 'Logs']
</script>

<style scoped>
.sidebar {
  width: 180px;
  background-color: #111;
  color: white;
  /* padding: 16px; */
  display: flex;
  flex-direction: column;
}
button {
  background: none;
  color: inherit;
  border: none;
  padding: 8px 12px;
  text-align: left;
  cursor: pointer;
}
button.active {
  background-color: #333;
}
</style>
