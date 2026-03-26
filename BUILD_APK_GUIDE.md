# Build APK com Bubblewrap - Guia Completo

## ✅ Pré-requisitos

- ✅ Node.js instalado
- ✅ npm (vem com Node.js)
- ✅ Bubblewrap instalado (já fiz)
- ⚠️ Java JDK 17+ (opcional - Bubblewrap vai baixar se não tiver)

## 🚀 Como Fazer o Build

### **Opção 1: Executar o Script (RECOMENDADO)**

```bash
# Vá até a pasta do projeto
cd "C:\Users\giova\OneDrive\Desktop\app-tela-corporativa"

# Execute o arquivo batch
build-apk.bat
```

Pronto! O script vai:
1. ✅ Criar pasta `bubblewrap-build`
2. ✅ Inicializar Bubblewrap
3. ✅ Gerar chave de assinatura (keystore)
4. ✅ Fazer build do APK
5. ✅ Salvar em: `bubblewrap-build/app-release.apk`

**Tempo:** 5-10 minutos (primeira vez demora mais por baixar JDK)

---

### **Opção 2: Fazer Manual com Comandos**

Se preferir controle total:

```bash
# 1. Criar diretório de build
mkdir bubblewrap-build
cd bubblewrap-build

# 2. Inicializar Bubblewrap
bubblewrap init ^
  --manifest https://app-tela-corporativa.vercel.app/manifest.json ^
  --package-id com.nexdisplay.app ^
  --app-name NEXDISPLAY ^
  --launcher-name "NEXDISPLAY - Gestão Inteligente" ^
  --version 1.0.0 ^
  --version-code 1

# 3. Build APK
bubblewrap build
```

---

## 📱 Resultado

Após o build completar, você terá:

```
bubblewrap-build/
├── app-release.apk          ← O arquivo para instalar!
├── app.keystore             ← Chave de assinatura
├── BubblewrapConfig.json    ← Configurações
└── ... (arquivos do projeto)
```

---

## 📲 Instalar no Android

### **Via USB:**
1. Conecte seu Android ao PC
2. Copie `app-release.apk` para o telefone
3. Abra o arquivo no telefone
4. Android vai pedir permissão para instalar
5. Clique "Instalar"

### **Via Link:**
1. Compartilhe o APK por email/Drive/WhatsApp
2. Baixe no Android
3. Abra o arquivo
4. Clique "Instalar"

### **Via ADB (para developers):**
```bash
adb install app-release.apk
```

---

## 🔐 Chave de Assinatura (Keystore)

O arquivo `app.keystore` é criado automaticamente:
- **Alias:** nexdisplay
- **Senha:** nexdisplay123 (mude depois!)
- **Validade:** 10 anos

**IMPORTANTE:** Guarde este arquivo! Precisa dele para:
- Atualizações no Google Play
- Manter mesmo ID do app

---

## 📤 Publicar no Google Play

Depois de ter o APK:

1. **Crie uma conta de desenvolvedor:**
   - https://play.google.com/console
   - Custa $25 (uma vez)

2. **Crie um novo app:**
   - Preencha informações
   - Upload do APK
   - Use o mesmo `app.keystore` para assinatura

3. **Preencha loja:**
   - Screenshots
   - Descrição
   - Ícones
   - Política de privacidade

4. **Enviar para review:**
   - Demora 1-3 dias
   - Depois fica disponível para todos!

---

## 🐛 Troubleshooting

### "Java not found"
```bash
# Install JDK 17
# Download: https://www.oracle.com/java/technologies/downloads/
# Or Bubblewrap baixa automaticamente
```

### "keytool not found"
```bash
# Add Java to PATH
# Ou deixa Bubblewrap fazer tudo
```

### Build falha com erro X
```bash
# Limpe e tente novamente
rm -rf bubblewrap-build
build-apk.bat
```

### APK muito grande
Normal! Vem com Chromium embutido. Tamanho típico: 50-100MB

---

## 📊 Tamanhos Esperados

- APK não comprimido: ~80MB
- APK comprimido (para Play): ~30-50MB
- Instalado no Android: ~100-150MB

---

## ✅ Próximos Passos

1. Execute `build-apk.bat`
2. Aguarde 10 minutos
3. Procure por `app-release.apk` em `bubblewrap-build/`
4. Teste no Android
5. Se funcionar, publique no Google Play!

---

## 📚 Referências

- [Bubblewrap GitHub](https://github.com/GoogleChromeLabs/bubblewrap)
- [Google Play Console](https://play.google.com/console)
- [Web.dev PWA Guide](https://web.dev/pwa/)

---

**Pronto! Você tem tudo para gerar seu APP! 🚀**
