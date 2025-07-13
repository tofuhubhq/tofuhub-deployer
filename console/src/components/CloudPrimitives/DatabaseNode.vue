<script setup lang="ts">
import { computed, toRef } from 'vue'
import { Handle, useNodeConnections } from '@vue-flow/core'
import { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()

// Later this can hold tables, schemas, etc
const roles = props.data?.roles ?? ['Read/Write', 'Analytics']
const dbName = props.data?.name ?? 'PostgreSQL'

const sourceConnections = useNodeConnections({ handleType: 'target' })
const targetConnections = useNodeConnections({ handleType: 'source' })

const isStartNode = toRef(() => sourceConnections.value.length <= 0)
const isEndNode = toRef(() => targetConnections.value.length <= 0)

const emoji = computed(() => '🐘') // or "🗄️" for generic DB
</script>

<template>
  <div class="db-node">
    <div class="title">{{ emoji }} {{ dbName }}</div>

    <!-- <div class="roles">
      <div v-for="(role, i) in roles" :key="i" class="role">
        {{ role }}
      </div>
    </div> -->

    <!-- Optional Vue Flow handles -->
    <Handle v-if="!isStartNode" type="target" position="top" />
    <Handle v-if="!isEndNode" type="source" position="bottom" />
  </div>
</template>

<style scoped>
.db-node {
  background-color: #0f172a;
  border: 2px solid #3b82f6;
  border-radius: 10px;
  color: white;
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

.title {
  text-align: center;
  font-weight: bold;
  color: #60a5fa;
}

.roles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}

.role {
  background-color: #1e40af;
  color: #e0f2fe;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 11px;
}
</style>
