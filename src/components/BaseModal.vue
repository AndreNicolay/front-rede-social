<script setup lang="ts">
import { onMounted, onUnmounted, useId } from 'vue';

defineProps<{ titulo: string }>();
const emit = defineEmits<{ fechar: [] }>();

const idTitulo = useId();

function fecharComEsc(evento: KeyboardEvent) {
  if (evento.key === 'Escape') emit('fechar');
}
onMounted(() => window.addEventListener('keydown', fecharComEsc));
onUnmounted(() => window.removeEventListener('keydown', fecharComEsc));
</script>

<template>
  <div class="modal-overlay" @click.self="emit('fechar')">
    <div class="modal-content" role="dialog" aria-modal="true" :aria-labelledby="idTitulo">
      <div class="modal-header">
        <h3 :id="idTitulo">{{ titulo }}</h3>
        <button type="button" class="close-btn" aria-label="Fechar modal" @click="emit('fechar')">&times;</button>
      </div>
      <div class="modal-body">
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.modal-content {
  width: min(100%, 380px);
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
  animation: fadeInModal 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #dbdbdb;
}

.modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-btn {
  border: none;
  background: transparent;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: #262626;
}

.modal-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 10px 16px 16px;
}

@keyframes fadeInModal {
  from { opacity: 0; transform: translateY(-12px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
