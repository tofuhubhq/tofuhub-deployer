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
  return '🖥️'
  // switch (primitive.value) {
  //   case CloudPrimitive.DATABASE:
      
  //   default:
  //     return '🏠'
  // }
})
</script> -->

<script setup lang="ts">
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

const targets = props.data?.targets ?? ['Service A', 'Service B']
</script>

<template>
  <div class="lb-node">
    <div class="title">⚖️ Load Balancer</div>
    <!-- <div class="targets">
      <div v-for="(t, i) in targets" :key="i" class="target">
        {{ t }}
      </div>
    </div> -->
  </div>
</template>

<style scoped>
.lb-node {
  background-color: #f9fafb;
  border: 2px dashed #3b82f6;
  border-radius: 10px;
  color: #0f172a;
  font-family: monospace;
  font-size: 12px;
  padding: 8px;
  min-width: 120px;
  max-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: 0 0 3px rgba(0, 0, 0, 0.1);
}

.title {
  text-align: center;
  font-weight: bold;
  color: #1e3a8a;
}

.targets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.target {
  background-color: #dbeafe;
  color: #1e3a8a;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
}
</style>
