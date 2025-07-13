<script setup lang="ts">
import { computed, toRef } from 'vue'
import { Handle, useNodeConnections, NodeProps } from '@vue-flow/core'

/* ---------- props & fallbacks ---------- */
const props = defineProps<NodeProps>()

const cacheName      = props.data?.name  ?? 'Redis Cache'
const allowedActions = props.data?.modes ?? ['GET', 'SET']

/* ---------- connection helpers ---------- */
const sourceConns = useNodeConnections({ handleType: 'target' })
const targetConns = useNodeConnections({ handleType: 'source' })

const isStartNode = toRef(() => sourceConns.value.length <= 0)
const isEndNode   = toRef(() => targetConns.value.length <= 0)

/* ---------- icon / emoji ---------- */
const emoji = computed(() => '🧰')   // or '🚀' / '⚡' / '🗄️'
</script>

<template>
  <div class="cache-node">
    <div class="title">{{ emoji }} {{ cacheName }}</div>

    <!-- <div class="modes">
      <span v-for="(m, i) in allowedActions" :key="i" class="mode">{{ m }}</span>
    </div> -->

    <!-- Vue-Flow handles -->
    <Handle v-if="!isStartNode" type="target" position="top" />
    <Handle v-if="!isEndNode"   type="source" position="bottom" />
  </div>
</template>

<style scoped>
/* ---------- card container ---------- */
.cache-node {
  background-color: #1f2937;          /* slate-800 */
  border: 2px solid #ef4444;          /* red-500 */
  border-radius: 10px;
  color: #f9fafb;                     /* slate-50 */
  font-family: monospace;
  font-size: 12px;
  padding: 8px;
  min-width: 120px;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

/* ---------- header ---------- */
.title {
  text-align: center;
  font-weight: bold;
  color: #f87171;                     /* red-400 */
}

/* ---------- badges ---------- */
.modes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.mode {
  background-color: #b91c1c;          /* red-700 */
  color: #fee2e2;                     /* red-100 */
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
}
</style>
