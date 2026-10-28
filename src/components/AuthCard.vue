<!-- Moldura das telas de login, cadastro e redefinição de senha -->
<template>
  <main class="auth-page page">
    <div class="auth-box">
      <h1 class="logo">SnapShot</h1>
      <slot />
    </div>
  </main>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.auth-box {
  background: #fff;
  border: 1px solid #dbdbdb;
  border-radius: 8px;
  padding: 32px 24px;
  width: 320px;
  text-align: center;
}

.logo {
  margin: 0 0 24px;
}

.auth-box :deep(form) {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.auth-box :deep(input) {
  padding: 10px 12px;
  border: 1px solid #dbdbdb;
  border-radius: 6px;
  font-size: 14px;
}

.auth-box :deep(.troca) {
  margin-top: 16px;
  font-size: 14px;
}
</style>
