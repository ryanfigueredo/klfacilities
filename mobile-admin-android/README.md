# KL Administração – Android (Kotlin nativo)

App Android nativo em **Kotlin** com **Jetpack Compose**, focado em **Checklists** e **Pontos**, integrado às APIs do KL Facilities (enterprise-erp-nextjs-aws).

- **Package:** `com.kl.adm` (mesmo do app Expo, para substituir na Play Console)
- **Min SDK:** 24 | **Target SDK:** 35

## Funcionalidades

- **Login** (JWT, mesmo endpoint `/api/mobile/auth-admin`)
- **Dashboard** com acesso a Checklists e Pontos
- **Checklists:** lista de escopos pendentes, abrir detalhe do escopo (perguntas por grupo)
- **Pontos:** lista de folhas de ponto (funcionários por mês)

## Como rodar

1. **Android Studio**
   - Abra a pasta `mobile-admin-android` no Android Studio.
   - Sync do Gradle (File → Sync Project with Gradle Files).
   - Conecte um device ou inicie um emulador e rode (Run ▶).

2. **Linha de comando** (com Gradle instalado)
   ```bash
   gradle wrapper   # gera gradlew na primeira vez
   ./gradlew assembleDebug
   ./gradlew installDebug   # instala no device conectado
   ```

## Estrutura

- `app/src/main/java/com/kl/adm/`
  - `data/api/` – Retrofit, `ApiConfig`, `AuthInterceptor`, `ApiModule`
  - `data/model/` – DTOs (auth, checklist, ponto)
  - `data/repository/` – `AuthRepository`, `ChecklistRepository`, `PontoRepository`
  - `ui/theme/` – tema (KL blue)
  - `ui/navigation/` – `NavGraph` (Login → Dashboard → Checklists / Pontos)
  - `ui/screens/` – Login, Dashboard, Checklists, ChecklistDetail, Pontos

## API

Base URL: `https://www.klfacilities.com.br` (em `ApiConfig.kt`).

Endpoints usados: auth-admin, me, checklists-operacionais (pendentes, em-aberto, respondidos, escopos), ponto/supervisor/folhas.

## Build de release (AAB)

```bash
./gradlew bundleRelease
```

O AAB fica em `app/build/outputs/bundle/release/app-release.aab`. Use o mesmo keystore do app atual (`com.kl.adm`) para publicar como atualização na Play Console.
