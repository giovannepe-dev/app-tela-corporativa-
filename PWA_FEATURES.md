# Funcionalidades Avançadas de PWA

Este documento descreve as funcionalidades avançadas implementadas na PWA NEXDISPLAY.

## 📋 Funcionalidades Implementadas

### 1. Push Notifications (Notificações Push)

Permite enviar notificações ao usuário mesmo quando o app está fechado.

**Uso:**
```typescript
import { useAdvancedPWA } from '@/hooks/use-advanced-pwa';

function MyComponent() {
  const { enablePushNotifications, showNotification } = useAdvancedPWA();

  const handleEnable = async () => {
    const success = await enablePushNotifications('VAPID_PUBLIC_KEY');
    if (success) {
      await showNotification('Notificações ativadas!');
    }
  };

  return <button onClick={handleEnable}>Ativar Notificações</button>;
}
```

**Configuração necessária:**

1. Gerar par de chaves VAPID:
```bash
# Use web-push CLI ou similar
npm install -g web-push
web-push generate-vapid-keys
```

2. Adicionar VAPID_PUBLIC_KEY ao `.env`:
```
VITE_VAPID_PUBLIC_KEY=seu_vapid_public_key_aqui
```

3. Armazenar subscription no backend:
```typescript
// No arquivo: src/services/pwa-advanced.ts
// Linha ~60 - Descomente e implemente:
// await fetch('/api/subscribe-push', {
//   method: 'POST',
//   body: JSON.stringify(subscription),
// });
```

4. Implementar endpoint `/api/subscribe-push` no backend para salvar subscriptions.

5. Para enviar notificações (no backend):
```typescript
// Pseudocódigo
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:seu-email@exemplo.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

const payload = JSON.stringify({
  title: 'Título da Notificação',
  body: 'Corpo da notificação',
  tag: 'notification-tag',
  data: { url: '/widgets' }
});

await webpush.sendNotification(subscription, payload);
```

---

### 2. Background Sync (Sincronização em Background)

Permite que tarefas sejam executadas quando o usuário voltar online.

**Uso:**
```typescript
const { syncWidgets } = useAdvancedPWA();

// Ao editar um widget offline
await syncWidgets({
  widgetId: 123,
  data: { name: 'Novo Nome' }
});

// Service Worker vai sincronizar quando online
```

**Como funciona:**
1. Usuário faz uma ação offline (editar, criar, deletar)
2. Tarefa é registrada com `registerBackgroundSync()`
3. Dados são salvos em IndexedDB
4. Quando conectar à internet, Service Worker executa a tarefa
5. Se falhar, o navegador retry automaticamente

**Implementação no Service Worker:**
O arquivo `public/service-worker.js` já tem handlers para:
- `sync-widgets` - Sincronizar widgets
- `sync-units` - Sincronizar unidades

Customize os endpoints conforme necessário.

---

### 3. Periodic Background Sync (Sincronização Periódica)

Permite que tarefas sejam executadas periodicamente, mesmo com app fechado.

**Uso:**
```typescript
import { registerPeriodicSync } from '@/services/pwa-advanced';

// Sincronizar a cada 15 minutos (mínimo permitido)
await registerPeriodicSync('sync-widgets', {
  minInterval: 15 * 60 * 1000
});
```

**Requisitos:**
- App deve estar instalado
- Usuário deve ter dado permissão
- Mínimo de 15 minutos entre sincronizações
- Requer HTTPS

**Suporte do navegador:**
- ✅ Chrome/Edge (desktop e mobile)
- ✅ Samsung Internet
- ❌ Firefox/Safari (não suportam)

**Nota:** Se não suportado, o código fallback para manual sync.

---

### 4. Protocol Handlers (Manipuladores de Protocolo)

Permite que URLs customizadas (`nexdisplay://`) abram o app.

**Exemplos:**
```
nexdisplay://widget/123      → Abre widget 123
nexdisplay://unit/456        → Abre unidade 456
```

**Uso:**
```html
<!-- Link que abre no app -->
<a href="nexdisplay://widget/123">Abrir Widget</a>
```

**Registro:**
Já configurado no `manifest.json`:
```json
"protocol_handlers": [
  {
    "protocol": "nexdisplay",
    "url": "/?protocol=%s"
  }
]
```

O parâmetro `%s` é substituído pela URL chamada.

---

### 5. Share Target (Alvo de Compartilhamento)

Permite que o app receba conteúdo compartilhado do sistema operacional.

**Como funciona:**
1. Usuário compartilha imagem/texto/URL de outro app
2. Sistema oferece NEXDISPLAY como opção
3. App recebe os dados em `/api/share`

**Uso:**
```typescript
const { getShared } = useAdvancedPWA();

function MyComponent() {
  useEffect(() => {
    const shared = getShared();
    if (shared) {
      console.log('Recebido:', shared);
      // { title, text, url, image }
    }
  }, []);
}
```

**Configuração:**
Já está no `manifest.json`:
```json
"share_target": {
  "action": "/?action=share",
  "method": "POST",
  "enctype": "multipart/form-data",
  "params": {
    "title": "title",
    "text": "text",
    "url": "url",
    "files": [...]
  }
}
```

---

### 6. Note Taking (Aplicativo de Anotações)

Identifica o app como uma aplicação de anotações.

**Benefícios:**
- Sistema operacional pode oferecer "Nova Nota" no menu
- Integração com atalhos do SO

**Configuração:**
Já está no `manifest.json`:
```json
"note_taking": {
  "new_note_url": "/?action=new-note"
}
```

---

### 7. Edge Side Panel (Painel Lateral no Edge)

Permite que o app seja aberto em um painel lateral no Microsoft Edge.

**Benefícios:**
- Acesso rápido ao app enquanto navega
- Melhor experiência no Windows

**Configuração:**
```json
"edge_side_panel": {
  "preferred_width": 346
}
```

---

## 🚀 Como Usar

### Adicionar no Settings/Preferences do app:

```typescript
import { AdvancedPWASettings } from '@/components/pwa/AdvancedPWASettings';

export function SettingsPage() {
  return (
    <div>
      <h1>Configurações</h1>
      <AdvancedPWASettings />
    </div>
  );
}
```

### Ouvir eventos de sincronização:

```typescript
function MyComponent() {
  useEffect(() => {
    window.addEventListener('nexdisplay:widgets-updated', (e) => {
      console.log('Widgets atualizados:', e.detail);
      // Atualizar UI
    });

    window.addEventListener('nexdisplay:units-updated', (e) => {
      console.log('Unidades atualizadas:', e.detail);
      // Atualizar UI
    });
  }, []);
}
```

---

## 🔧 Configuração do Backend Necessária

### 1. Endpoint para subscrições de push:
```
POST /api/subscribe-push
Body: { endpoint, keys: { auth, p256dh } }
```

### 2. Endpoint para enviar notificações:
```
POST /api/notifications/send
Body: { userId, title, body, data }
```

### 3. Endpoints para sincronização:
```
GET  /api/widgets
GET  /api/units
POST /api/sync-status
```

### 4. Suporte a headers customizados:
```
Header: X-Background-Sync: true
```

---

## 📊 Compatibilidade de Navegadores

| Funcionalidade | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Push Notifications | ✅ | ✅ | ⚠️ | ✅ |
| Background Sync | ✅ | ❌ | ❌ | ✅ |
| Periodic Sync | ✅ | ❌ | ❌ | ✅ |
| Protocol Handlers | ✅ | ✅ | ⚠️ | ✅ |
| Share Target | ✅ | ⚠️ | ⚠️ | ✅ |
| Widgets (Windows) | - | - | - | ✅ |

⚠️ = Suporte parcial

---

## 🐛 Troubleshooting

### Push Notifications não funcionam:
- [ ] Verificar se VAPID_PUBLIC_KEY está configurada
- [ ] Verificar se Service Worker está registrado
- [ ] Verificar permissão de notificações do navegador
- [ ] Verificar se está em HTTPS

### Background Sync não está funcionando:
- [ ] Verificar se service worker está ativo
- [ ] Verificar DevTools → Application → Service Workers
- [ ] Testar com DevTools → Network → Offline
- [ ] Checar console para erros

### Protocol handlers não funcionam:
- [ ] App deve estar instalado
- [ ] Requer HTTPS
- [ ] Testar com links diretos

---

## 📚 Referências

- [Web Push Notifications](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [Background Sync](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)
- [Periodic Background Sync](https://developer.chrome.com/docs/web-platform/periodic-background-sync/)
- [Web Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Service Workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
