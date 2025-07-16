<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const HOST =
  import.meta.env.DEV
    ? 'localhost:80'
    : window.location.host

const HTTP_HOST = `http://${HOST}`
const WS_HOST = `ws://${HOST}`
const route = useRoute()
const router = useRouter()

const deployer = computed(() => route.query.deployer as string | undefined)
const dropletId = computed(() => route.query.droplet_id as string | undefined)
const token = computed(() => route.query.token as string | undefined)

// ---- reactive state -------------------------------------------------------
const isLoading = ref(false)
const isRunning = ref(false)
const variables   = ref<Record<string, any>>({})
const form        = ref<Record<string, any>>({})
const loading     = ref(true)
const error       = ref<string | null>(null)
const collisions = ref<Record<string, { exists: boolean; message?: string }>>({})
const invalidFields = ref<Record<string, boolean>>({})

const packageName = computed(() => {
  return route.query.package as string | undefined
})
// ---------------------------------------------------------------------------

const hasCollisions = computed(() =>
  Object.values(collisions.value).some((entry) => entry.exists)
)

/**
 * Initialise deployer state for the selected package.
 * Mirrors what the Rust CLI used to do.
 */
async function initPackageState (packageName: string) {
  if (!packageName) {
    error.value = 'No ?package= query param found'
    loading.value = false
    return
  }

  try {
    const res = await fetch(`${HTTP_HOST}/state/init`, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify([packageName])     // keep the array payload
    })

    if (!res.ok) throw new Error(await res.text())

    const data = await res.json()              // { steps, variables, ... }
    variables.value = data.variables ?? {}
    // Seed the form with default / first accepted value
    form.value = Object.fromEntries(
      [...Object.entries(variables.value)]
      .sort(([_, a]: any, [__, b]: any) => {
          const aPrim = a.primitive ?? ''
          const bPrim = b.primitive ?? ''
          if (aPrim === 'access_token' && bPrim !== 'access_token') return -1
          if (aPrim !== 'access_token' && bPrim === 'access_token') return 1
          return 0
        })
        .map(([key, cfg]: any) => {
          const fallback =
            cfg.default ??
            (Array.isArray(cfg.options) && cfg.options[0]?.value) ??
            ''
          return [key, fallback]
        })
    )

    console.info(form.value)

  } catch (e: any) {
    error.value = e.message || 'Init failed'
  } finally {
    loading.value = false
  }
}

// ─────────────────────────────────────────────────────────────

// 1️⃣ Fire once on initial mount (if the query param is already there)
onMounted(() => {
  const pkg = route.query.package as string | undefined
  if (pkg) initPackageState(pkg)
})

// 2️⃣ React if the URL changes or if the param shows up later
watch(
  () => route.query.package,
  (pkg) => {
    if (typeof pkg === 'string' && pkg.trim().length) {
      initPackageState(pkg)
    }
  }
)

function setupLogStream(stepName?: string) {
  const socket = new WebSocket(`${WS_HOST}/logs`)

  socket.onmessage = (event) => {
    const log = document.getElementById('log-output')
    if (log) {
      log.textContent += event.data
      log.scrollTop = log.scrollHeight
    }
  }

  socket.onerror = (e) => {
    console.error('WebSocket error', e)
  }
}

async function deploy() {
  // Early validation
  // Reset previous state
  invalidFields.value = {}

  let foundInvalid = false
  for (const [key, value] of Object.entries(form.value)) {
    const isInvalid = value === null || value === undefined || value === ''
    if (isInvalid) {
      invalidFields.value[key] = true
      foundInvalid = true
    }
  }

  if (foundInvalid) {
    error.value = 'Please fill in all required fields.'
    return
  }

  isLoading.value = true;
  
  try {
    /* ── 1. run a last-second collision check ───────────────────────────── */
    const colRes = await fetch(`${HTTP_HOST}/collisions/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })

    if (!colRes.ok) throw new Error(await colRes.text())

    const colResult = await colRes.json()
    collisions.value = colResult            // update the UI

    const hasAnyCollision = Object.values(colResult).some((e: any) => e.exists)
    if (hasAnyCollision) return;

    const res = await fetch(`${HTTP_HOST}/deploy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })

    if (!res.ok) throw new Error(await res.text())
    console.log('✅ Deployment started')

    isRunning.value = true;
    setupLogStream()

    // optionally route to a log screen or show toast
  } catch (err) {
    console.error('🚨 Deploy failed:', err)
    error.value = (err as Error).message
  } finally { 
    isLoading.value = false;
  }
}

function resetCollisionRetry(key: string) {
  if (collisions.value[key]) {
    delete collisions.value[key]
  }
}

async function destroyDroplet() {
  if (!deployer.value || !dropletId.value) {
    error.value = 'Missing deployer or droplet_id in URL';
    return;
  }

  isLoading.value = true;
  try {
    const res = await fetch(`${HTTP_HOST}/destroy/by-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deployer: deployer.value,
        droplet_id: Number(dropletId.value),
        token: token.value
      })
    });

    if (!res.ok) throw new Error(await res.text());

    const result = await res.json();
    console.info('🗑️ Droplet destroyed:', result);
    alert(`Droplet ${result.droplet_id} destroyed.`);
  } catch (err) {
    console.error('🚨 Droplet destruction failed:', err);
    error.value = (err as Error).message;
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <div class="container">
    <h2 v-if="packageName">Inputs for {{ packageName }}</h2>
    <h2 v-else>No package specified</h2>

    <div v-if="loading">Loading variables…</div>
    <!-- <div v-else-if="error" class="error">{{ error }}</div> -->

    <div v-else>
      <div
        v-for="key in Object.keys(form)"
        :key="key"
        class="form-group"
      >
        <label :for="key" class="label-with-tooltip">
          {{ key }}
          <span
            v-if="variables[key].description"
            class="tooltip-icon"
            :title="variables[key].description"
          >❓</span>
        </label>

        <select
          v-if="Array.isArray(variables[key].options) && variables[key].options.length"
          :id="key"
          v-model="form[key]"
          :disabled="isLoading"
          @change="() => resetCollisionRetry(key)"
          :class="{ 'colliding': collisions[key]?.exists, 'invalid': invalidFields[key] }"
        >
          <option
            v-for="option in variables[key].options"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>

        <input
          v-else
          :id="key"
          :type="variables[key].type === 'number' ? 'number' : 'text'"
          v-model="form[key]"
          :placeholder="variables[key].description"
          :disabled="isLoading"
          :class="{
            'colliding': collisions[key]?.exists,
            'invalid': invalidFields[key]
          }"
          @input="() => resetCollisionRetry(key)"
        />

        <p v-if="collisions[key]?.exists" class="collision-msg">
          {{ collisions[key].message || 'Collision detected' }}
        </p>
      </div>

      <button @click="deploy" :disabled="hasCollisions || isLoading && !isRunning">
        Deploy
      </button>

      <a :href="`/api/download/${packageName}.zip`" download>
        📦 Download full deployment archive
      </a>

      <button
        v-if="deployer && dropletId"
        @click="destroyDroplet"
        :disabled="isLoading"
      >
        🗑️ Destroy Droplet ({{ dropletId }})
      </button>
    </div>
  </div>
</template>

<style scoped>
.container {
  padding: 2rem;
  max-width: 600px;
  margin: 0 auto;
  font-family: system-ui, sans-serif;
  background: #f9fafb;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

h2 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: #111827;
}

.error {
  color: #dc2626;
  background: #fef2f2;
  border: 1px solid #fca5a5;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1.2rem;
  display: flex;
  flex-direction: column;
}

label {
  font-weight: 500;
  margin-bottom: 0.4rem;
  color: #374151;
}

input,
select {
  padding: 0.6rem 0.8rem;
  font-size: 0.95rem;
  border-radius: 6px;
  border: 1px solid #d1d5db;
  transition: border-color 0.2s, box-shadow 0.2s;
}

input:focus,
select:focus {
  border-color: #2563eb;
  outline: none;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

.colliding {
  border: 2px solid #dc2626 !important;
  background-color: #fef2f2 !important;
}

.invalid {
  border: 2px solid #dc2626 !important;
  background-color: #fef2f2 !important;
}

.collision-msg {
  color: #dc2626;
  font-size: 0.85rem;
  margin-top: 0.3rem;
  padding-left: 0.2rem;
}

button {
  padding: 0.6rem 1.2rem;
  font-size: 0.95rem;
  font-weight: 500;
  color: white;
  background-color: #2563eb;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  margin-right: 0.8rem;
  margin-top: 1rem;
  transition: background-color 0.2s;
}

button:hover {
  background-color: #1d4ed8;
}

button[disabled] {
  opacity: 0.6;
  cursor: not-allowed;
}
input[disabled],
select[disabled] {
  background-color: #f3f4f6;
  cursor: not-allowed;
  opacity: 0.8;
}
.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid #cbd5e1;
  border-top: 2px solid #2563eb;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 6px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}


</style>
