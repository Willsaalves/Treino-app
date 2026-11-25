# Treino: app pessoal de treino, dieta e evolução

App nativo (Expo / React Native) + servidor Node rodando no seu PC. O celular acessa o servidor pelo **Tailscale**, em casa ou na academia. O coach usa a **API do Claude** e lê seus treinos, peso, cintura, dieta e (se você quiser) as fotos.

```
treino-app/
├── server/   Node + Express + SQLite (better-sqlite3) + Claude API
└── app/      Expo SDK 58 + Expo Router (5 abas)
```

## O que já vem pronto

| Aba | O que faz |
|---|---|
| 🏋️ **Treino** | Treino do dia pela sua divisão de 5 dias, registro de carga × reps por série, timer de descanso e **sugestão automática de carga** |
| 📚 **Exercícios** | 41 exercícios com execução, erros comuns, substitutos e gráfico de força (1RM estimado) |
| 🍽️ **Dieta** | Plano alimentar com checklist, barras de proteína/kcal/água, creatina, sono e extras fora do plano |
| 📈 **Evolução** | Peso (média semanal), cintura, gráficos e fotos por pose (frente/lado/costas) com comparação primeira × última |
| 🤖 **Coach** | Chat com o Claude usando seus dados reais. Tem perguntas prontas ("revise minha semana", "minhas calorias estão certas?"…) |

Também dá pra editar a divisão (trocar exercício, séries, reps, ordem) e o plano alimentar pelo app.

### Como a progressão automática funciona (dupla progressão)
- Se você bateu o **topo da faixa em todas as séries** → o app sugere subir a carga (+2 kg halter, +2,5 kg barra/máquina composta, +1 kg isolado) e voltar pro mínimo de reps.
- Se ficou **abaixo do mínimo duas sessões seguidas** → sugere reduzir ~5%.
- Nos outros casos → mesma carga, +1 rep.

---

## 1. Servidor (no PC)

Requisitos: **Node 20+**.

```bash
cd server
npm install
cp .env.example .env      # Windows: copy .env.example .env
```

Edite o `.env`:
- `ANTHROPIC_API_KEY`: crie em https://console.anthropic.com → API Keys (o custo é por uso, centavos por conversa).
- `APP_TOKEN`: invente uma senha. **Recomendado**, porque suas fotos ficam no servidor.

```bash
npm run dev               # sobe em http://0.0.0.0:3333
```

Os dados ficam em `server/data/` (`treino.db` + `photos/`). **Faça backup dessa pasta.**

## 2. Tailscale (acesso de qualquer lugar)

1. Instale o Tailscale no PC e no celular (mesma conta): https://tailscale.com/download
2. **Opção recomendada: HTTPS com `tailscale serve`.** No painel do Tailscale, ative *MagicDNS* e *HTTPS Certificates* (DNS → HTTPS). Depois rode no PC:
   ```bash
   tailscale serve --bg 3333
   ```
   O endereço do servidor vira `https://NOME-DO-PC.SEU-TAILNET.ts.net`.
3. **Opção simples:** use o IP do Tailscale: `http://100.x.y.z:3333` (veja com `tailscale ip -4`).

O servidor só fica visível pra aparelhos da sua conta Tailscale. Ele não é exposto na internet.

## 3. App (no celular)

```bash
cd app
npm install
npx expo start
```

Abra o **Expo Go** no celular e escaneie o QR code. Na primeira vez o app abre em **Ajustes**: cole o endereço do servidor e o `APP_TOKEN` e toque em **Salvar e testar**.

**Para abrir o app na academia** (fora do Wi-Fi de casa), o Metro também precisa ser acessível pelo Tailscale:

```bash
# macOS/Linux
REACT_NATIVE_PACKAGER_HOSTNAME=$(tailscale ip -4) npx expo start
# Windows (PowerShell)
$env:REACT_NATIVE_PACKAGER_HOSTNAME = (tailscale ip -4); npx expo start
```

> **Expo Go x SDK 58:** se o Expo Go da loja ainda não abrir projetos SDK 58, use um *development build*:
> `npx expo run:android` / `npx expo run:ios` (precisa de Android Studio / Xcode), ou `npx eas-cli@latest build --profile development`.
>
> **App instalado de verdade (sem depender do PC ligado pra abrir):**
> Android → `npx eas-cli@latest build -p android --profile preview` gera um APK.
> iPhone → precisa de conta Apple Developer (US$ 99/ano) para instalar fora do Expo Go.
> Em qualquer caso, o **servidor** precisa estar ligado pra salvar e ler dados.

## Personalizar

- **Metas** (kcal, proteína, água, sono), **altura**, **objetivo** e **observações pro coach**: em Ajustes no app.
- **Divisão de treino**: na aba Treino, toque em "Editar divisão".
- **Plano alimentar**: na aba Dieta, toque em "Editar plano alimentar".
- **Novos exercícios na biblioteca**: em `server/src/seed.ts` (array `EXERCISES`). Eles são aplicados quando o servidor reinicia, sem apagar seus dados.
- **Modelo do coach**: `CLAUDE_MODEL` no `.env`.

## API (resumo)

| Método | Rota | |
|---|---|---|
| GET | `/api/workout?date=YYYY-MM-DD` | treino do dia + sugestões + séries feitas |
| POST | `/api/logs` | registra/corrige uma série `{date, exercise_id, set_number, weight, reps}` |
| GET/PUT/DELETE | `/api/days[/:weekday]` | divisão |
| GET/POST | `/api/exercises[/:id]` | biblioteca + histórico |
| GET | `/api/diet?date=` · POST `/api/diet/check` · PUT `/api/diet/daily` · PUT `/api/diet/meals` | dieta |
| GET | `/api/progress` · POST `/api/metrics` · POST `/api/photos` (multipart) | evolução |
| GET/PUT | `/api/settings` | metas e perfil |
| GET/POST/DELETE | `/api/coach[/messages]` | coach (Claude) |

Todas as rotas (menos `/api/health`) exigem o header `x-app-token` quando `APP_TOKEN` está definido.

## Preview web (modo demonstração)

Pra ver o app no navegador sem servidor, com dados de exemplo simulados em memória:

```bash
cd app
npm run build:demo                 # export web com EXPO_PUBLIC_DEMO=1
python3 scripts/web-preview.py     # gera dist-demo/preview.html (arquivo único)
```

O `preview.html` abre em qualquer hospedagem estática. Pra publicar no Cloudflare Pages: `npx wrangler pages deploy dist-demo --project-name treino-preview`.
