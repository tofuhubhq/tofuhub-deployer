<!-- <script setup>
import { computed, toRef } from 'vue'
import { Handle, useNodeConnections } from '@vue-flow/core'
import { ProcessStatus, CloudPrimitive } from '../useRunProcess'

const props = defineProps({
  data: {
    type: Object,
    required: true,
  },
  sourcePosition: {
    type: String,
  },
  targetPosition: {
    type: String,
  },
})

const sourceConnections = useNodeConnections({
  handleType: 'target',
})

const targetConnections = useNodeConnections({
  handleType: 'source',
})

const isStartNode = toRef(() => sourceConnections.value.length <= 0)

const isEndNode = toRef(() => targetConnections.value.length <= 0)

// const status = toRef(() => props.data.status)

const primitive = toRef(() => { console.info(props.data); return props.data.type; })

const bgColor = computed(() => {
  return '#4b5563'
  // if (isStartNode.value) {
  //   return '#2563eb'
  // }

  // switch (status.value) {
  //   case ProcessStatus.ERROR:
  //     return '#f87171'
  //   case ProcessStatus.FINISHED:
  //     return '#42B983'
  //   case ProcessStatus.CANCELLED:
  //     return '#fbbf24'
  //   default:
  //     return '#4b5563'
  // }
})

// const processLabel = computed(() => {
//   switch (status.value) {
//     case ProcessStatus.ERROR:
//       return '❌'
//     case ProcessStatus.SKIPPED:
//       return '🚧'
//     case ProcessStatus.CANCELLED:
//       return '🚫'
//     case ProcessStatus.FINISHED:
//       return '😎'
//     case ProcessStatus.FINISHED:
//       return '🛢️'
//     default:
//       return '🏠'
//   }
// })

const processPrimitive = computed(() => {
  return '🛢️'
  // switch (primitive.value) {
  //   case CloudPrimitive.DATABASE:
      
  //   default:
  //     return '🏠'
  // }
})
</script>

<template>
  <div
    class="process-node"
    :style="{ backgroundColor: bgColor, boxShadow: 1 ? '0 0 10px rgba(0, 0, 0, 0.5)' : '' }"
  >
    <div class="db-node">
      <div class="db-top" />
      <div class="db-body" />
      <div class="db-bottom" />
    </div>
  </div>
</template>

<style scoped>
.process-node {
  padding: 10px;
  border-radius: 99px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.process-node .vue-flow__handle {
  border: none;
  height: unset;
  width: unset;
  background: transparent;
  font-size: 12px;
}

.db-node {
  width: 30px;
  height: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  user-select: none;
}

.db-top,
.db-bottom {
  width: 80%;
  height: 100%;
  background: #3b82f6;
  border-radius: 50%;
}

.db-body {
  width: 80%;
  height: 100%;
  background: #2563eb;
  border-left: 3px solid #1e40af;
  border-right: 3px solid #1e40af;
  position: relative;
  box-sizing: border-box;
}
</style> -->

<script setup lang="ts">
import { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

const containers = props.data?.containers ?? ['Chirpstack', 'Chirpstack Bridge IN', 'Chirpstack Bridge EU']
</script>

<template>
  <div class="droplet-node">
    <div class="title">💧 Droplet</div>
    <div class="containers">
      <div v-for="(c, i) in containers" :key="i" class="container">
        {{ c }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.droplet-node {
  background-color: #1e293b;
  border: 2px solid #3b82f6;
  border-radius: 12px;
  color: white;
  font-family: monospace;
  font-size: 12px;
  padding: 8px;
  min-width: 100px;
  max-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 0 4px #000a;
}

.title {
  text-align: center;
  font-weight: bold;
}

.containers {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.container {
  background-color: #38bdf8;
  color: #0f172a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
}
</style>
