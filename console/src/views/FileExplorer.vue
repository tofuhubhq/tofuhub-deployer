<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const packageName = route.query.package;
const files = ref([]);

onMounted(async () => {
  const res = await fetch(`/api/files/${packageName}`);
  const json = await res.json();
  files.value = json.files || [];
});
</script>

<template>
  <div v-if="files.length">
    <h3>📁 Files</h3>
    <ul>
      <li v-for="file in files" :key="file">
        <a :href="`/public/${packageName}/${file}`" target="_blank">
          {{ file }}
        </a>
      </li>
    </ul>
  </div>
</template>
