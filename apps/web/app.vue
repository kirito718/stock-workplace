<script setup lang="ts">
const { buildTodayActions, completeAction } = useResearchActions()
const actions = computed(() => buildTodayActions([], []))
</script>

<template>
  <main>
    <h1>投研台 Nuxt 迁移骨架</h1>
    <p>本 vertical slice 先承载公开公告代理和研究行动数据契约，旧版 MVP 保持不变。</p>
    <section aria-labelledby="actions-title">
      <h2 id="actions-title">今日行动</h2>
      <p v-if="!actions.length">暂无未完成行动</p>
      <ul v-else>
        <li v-for="action in actions" :key="action.id">
          <strong>{{ action.priority === 'urgent' ? '先核验' : '待复核' }}</strong> {{ action.title }}
          <button type="button" @click="completeAction(action.id)">完成</button>
        </li>
      </ul>
    </section>
  </main>
</template>
