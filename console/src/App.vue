<script setup lang="ts">
import 'splitpanes/dist/splitpanes.css'
import { Splitpanes, Pane } from 'splitpanes'

import Navbar from './components/Navbar.vue'
import DeployPanel from './components/DeployPanel.vue'
import ArchitecturePanel from './components/ArchitecturePanel.vue'
import LogsPanel from './components/LogsPanel.vue'
import InputsPanel from './components/InputsPanel.vue'
</script>

<template>
  <div class="app-container">
    <Navbar />

    <!-- Outer vertical split: Left (inputs + arch) | Right (logs) -->
    <Splitpanes class="main-body" horizontal>
      <Pane min-size="80">
        <Splitpanes>
          <!-- Inputs (top row) -->
          <Pane min-size="20">
            <div class="panel inputs">
              <InputsPanel />
            </div>
          </Pane>

          <!-- Architecture (bottom row) -->
          <Pane min-size="80">
            <div class="panel architecture">
              <ArchitecturePanel />
            </div>
          </Pane>
        </Splitpanes>
      </Pane>

      <Pane min-size="20">
        <div class="panel logs">
          <LogsPanel />
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* This fills remaining space below the navbar */
.main-body {
  flex: 1;
  height: 100%;
}

/* Optional panel styling */
.panel {
  height: 100%;
  width: 100%;
  overflow: auto;
  /* padding: 16px; */
}

.inputs {
  background-color: #ffffff;
}

.architecture {
  background-color: #0d0d18;
}

.logs {
  background-color: #0d0d0d;
  color: #ccc;
}
</style>