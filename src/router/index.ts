import { createRouter, createWebHistory } from 'vue-router';
import { useSessao } from '@/composables/useSessao';

declare module 'vue-router' {
  interface RouteMeta {
    /** Pode ser acessada sem login. */
    publica?: boolean;
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/feed' },
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { publica: true } },
    { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { publica: true } },
    { path: '/redefinicao', component: () => import('@/views/RedefinicaoView.vue'), meta: { publica: true } },
    { path: '/feed', component: () => import('@/views/FeedView.vue') },
    { path: '/posts/new', component: () => import('@/views/NovoPostView.vue') },
    { path: '/profile/:id?', component: () => import('@/views/PerfilView.vue') },
    { path: '/direct', component: () => import('@/views/DirectView.vue') },
    { path: '/:caminho(.*)*', redirect: '/feed' },
  ],
});

// Sem login, só as telas públicas abrem
router.beforeEach(to => {
  if (!to.meta.publica && !useSessao().logado.value) return '/login';
});

export default router;
