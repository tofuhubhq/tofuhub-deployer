<script setup lang="ts">
import { ref } from 'vue'
import Navbar from './components/Navbar.vue';
import ArchitecturePanel from './components/ArchitecturePanel.vue';
import LogsPanel from './components/LogsPanel.vue';
import DeployPanel from './components/DeployPanel.vue';
import Sidebar from './components/Sidebar.vue';
import InputsPanel from './components/InputsPanel.vue';

const activeTab = ref('Inputs')
</script>

<template>
  <div class="app-container">
    <Navbar />

    <div class="main-body">
      <Sidebar :activeTab="activeTab" @updateTab="activeTab = $event" />
      
      <div class="content">
        <InputsPanel v-if="activeTab === 'Inputs'" />
        <DeployPanel v-if="activeTab === 'Deploy'" />
        <LogsPanel v-if="activeTab === 'Logs'" />
        <ArchitecturePanel v-if="activeTab === 'Architecture'" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}
</style>
