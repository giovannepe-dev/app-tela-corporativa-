# CLAUDE.md - Workflow Rápido para NexDisplay

## 🚨 SITUAÇÃO ATUAL (28/03/2026)
- **Problema:** Vercel cacheando código antigo, não fazendo deploy de mudanças
- **Solução:** Começar novo projeto Vercel + Supabase do zero
- **Tempo:** 3-5 minutos se seguir exatamente

---

## ⚡ QUICK START - 3 MINUTOS

### Passo 1: Fazer mudança no código (1 min)
```bash
# Editar arquivo
# Exemplo: src/pages/DevicePairing.tsx
```

### Passo 2: Commit + Push (30 seg)
```bash
cd C:\Users\giova\OneDrive\Desktop\app-tela-corporativa
git add -A
git commit -m "DESCRIÇÃO_BREVE"
git push origin main
```

### Passo 3: Rebuild APK (1 min)
```bash
cd android
rm -rf .gradle app/build/intermediates
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk "C:\Users\giova\OneDrive\Desktop\NexDisplay-WORKING.apk"
```

### Passo 4: Testar no Celular (30 seg)
1. Desinstala app antigo COMPLETAMENTE
2. Instala NexDisplay-WORKING.apk
3. Config > Apps > [app] > Storage > **Clear Cache + Clear Data**
4. Força parar
5. Abre e testa

---

## ❌ NÃO FAÇA

- ❌ Não mexer em múltiplas coisas ao mesmo tempo
- ❌ Não testar sem limpar cache do celular
- ❌ Não compilar APK sem deletar .gradle e intermediates
- ❌ Não contar com Vercel para testar - sempre testar APK local
- ❌ Não tentar consertar "smart" - se não funciona, reset

---

## 🔴 SE FICAR PRESO (RESET COMPLETO)

```bash
# Volta ao ÚLTIMO commit que funcionava
git reset --hard 99663fb
git push -f origin main

# Clean rebuild
cd android
rm -rf .gradle app/build/intermediates
./gradlew assembleDebug
```

---

## 📱 ARQUIVO ÚNICO

**Sempre usar:** `C:\Users\giova\OneDrive\Desktop\NexDisplay-WORKING.apk`
- Deletar todos os outros .apk
- Nunca ter múltiplas versões na área de trabalho

---

## ✅ CHECKLIST ANTES DE COMEÇAR

- [ ] Último APK funcionava?
- [ ] Qual era o problema específico?
- [ ] Vou mexer em APENAS uma coisa?
- [ ] Vou testar APK, não Vercel?
- [ ] Vou limpar cache do celular?

Se responder "não" a alguma pergunta, PARE e alinha primeiro.
