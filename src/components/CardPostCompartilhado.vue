<script setup lang="ts">
import type { Post } from '@/types/api';

defineProps<{ postId: string; post: Post | null }>();
</script>

<template>
  <RouterLink
    v-if="post"
    :to="{ path: '/feed', query: { highlight: postId } }"
    class="shared-post-preview"
    :data-post-id="postId"
    title="Ver publicação"
  >
    <div class="shared-post-author">@{{ post.username }}</div>
    <img :src="post.imageUrl" alt="Post compartilhado">
    <div class="shared-post-caption">{{ post.caption || 'Publicação' }}</div>
  </RouterLink>
  <div v-else class="shared-post-unavailable">Publicação indisponível</div>
</template>

<style scoped>
.shared-post-preview {
  display: block;
  max-width: 180px;
  margin: 2px 0;
  overflow: hidden;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  background: #fff;
  color: inherit;
  text-decoration: none;
}

.shared-post-author {
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  color: #262626;
  border-bottom: 1px solid #efefef;
}

.shared-post-preview img {
  display: block;
  width: 100%;
  height: 120px;
  object-fit: cover;
}

.shared-post-caption {
  padding: 6px 8px;
  font-size: 11px;
  color: #737373;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shared-post-unavailable {
  font-style: italic;
  opacity: 0.8;
}
</style>
