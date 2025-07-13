<script setup lang="ts">
import { computed, toRef } from 'vue'
import { Handle, useNodeConnections, NodeProps } from '@vue-flow/core'

/* ---------- props & fallbacks ---------- */
const props = defineProps<NodeProps>()

const brokerName = props.data?.name ?? 'MQTT Broker'
const topics     = props.data?.topics ?? ['sensors/+/temperature', 'devices/+/status']

/* ---------- connection helpers ---------- */
const sourceConns = useNodeConnections({ handleType: 'target' })
const targetConns = useNodeConnections({ handleType: 'source' })

const isStartNode = toRef(() => sourceConns.value.length <= 0)
const isEndNode   = toRef(() => targetConns.value.length <= 0)

/* ---------- icon / emoji ---------- */
const emoji = computed(() => '📡') // or '📶' / '🔌'
</script>

<template>
  <div class="broker-node">
    <div class="title">{{ emoji }} {{ brokerName }}</div>

    <div class="topics">
      <span v-for="(t, i) in topics" :key="i" class="topic">{{ t }}</span>
    </div>

    <Handle v-if="!isStartNode" type="target" position="top" />
    <Handle v-if="!isEndNode"   type="source" position="bottom" />
  </div>
</template>

<style scoped>
.broker-node {
  background-color: #0f172a;          /* dark blue */
  border: 2px solid #10b981;          /* emerald-500 */
  border-radius: 10px;
  color: #f0fdfa;                     /* emerald-50 */
  font-family: monospace;
  font-size: 12px;
  padding: 8px;
  min-width: 140px;
  max-width: 240px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.4);
}

.title {
  text-align: center;
  font-weight: bold;
  color: #6ee7b7;                     /* emerald-300 */
}

.topics {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  word-break: break-word;
  padding: 0 2px;
}

.topic {
  background-color: #064e3b;          /* emerald-900 */
  color: #d1fae5;                     /* emerald-100 */
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 10px;
  text-align: center;
}
</style>
