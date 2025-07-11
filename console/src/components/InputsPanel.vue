<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const variables = ref<Record<string, any>>({})
const packageName = route.query.package as string
const form = ref<Record<string, any>>({})

onMounted(async () => {
  // const res = await fetch('https://164.90.220.244/state', {
  //   method: 'POST', // you're using `--data`, so it's POST
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({
  //     steps: [{ name: packageName, package: packageName, type: 'PACKAGE' }],
  //   }),
  // })
  const data = {variables:[]}

  // const data = await res.json()
  variables.value = data.variables
})

</script>

<template>
  <div>
    <h2>Inputs for {{ packageName }}</h2>
    <div v-if="Object.keys(variables).length === 0">Loading variables...</div>
    
    <div v-else>
      <div
        v-for="(config, key) in variables"
        :key="key"
        class="form-group"
      >
        <label :for="key">{{ key }}</label>

        <input
          v-if="config.type === 'string' || config.type === 'number'"
          :type="config.type === 'number' ? 'number' : 'text'"
          v-model="form[key]"
          :placeholder="config.description"
        />

        <select
          v-else-if="config.accepted_values.length > 0"
          v-model="form[key]"
        >
          <option
            v-for="val in config.accepted_values"
            :key="val"
            :value="val"
          >
            {{ val }}
          </option>
        </select>
      </div>
    </div>
  </div>
</template>
