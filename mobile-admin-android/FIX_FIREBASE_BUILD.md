# Fix: Erro de Build Firebase

## 🔴 Problema

```
Could not find com.google.firebase:firebase-messaging-ktx:.
Could not find com.google.firebase:firebase-analytics-ktx:.
```

## ✅ Solução

O Firebase BOM 34.x+ **removeu os módulos KTX**. O arquivo já está configurado para usar BOM 33.7.0, mas pode haver cache do Gradle.

### Passo 1: Limpar Cache do Gradle

**No Android Studio:**
1. **File → Invalidate Caches / Restart**
2. Selecione **Invalidate and Restart**
3. Aguarde o Android Studio reiniciar

**OU via terminal:**
```bash
cd mobile-admin-android
rm -rf .gradle
rm -rf app/build
rm -rf build
```

### Passo 2: Sincronizar Gradle

**No Android Studio:**
1. **File → Sync Project with Gradle Files**
2. Aguarde a sincronização terminar

### Passo 3: Verificar Versão do BOM

Certifique-se de que o arquivo `app/build.gradle.kts` tem:

```kotlin
implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
```

**NÃO use 34.x** porque remove os módulos KTX!

### Passo 4: Clean e Rebuild

**No Android Studio:**
1. **Build → Clean Project**
2. Aguarde terminar
3. **Build → Rebuild Project**

---

## 🔍 Verificação

Após seguir os passos acima, o build deve funcionar. Se ainda der erro:

1. Verifique se o arquivo `app/build.gradle.kts` tem `firebase-bom:33.7.0` (não 34.x)
2. Verifique se os repositórios estão configurados em `settings.gradle.kts`:
   ```kotlin
   repositories {
       google()
       mavenCentral()
   }
   ```

---

## 📝 Nota sobre Versões

- ✅ **BOM 33.7.0**: Suporta `-ktx` modules
- ❌ **BOM 34.x+**: Removeu `-ktx` modules (precisa usar `firebase-messaging` sem `-ktx`)

O projeto está configurado para usar **33.7.0**, que é a versão correta para manter os módulos KTX.
