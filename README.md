# Free LLM API — Dynamic Proxy

Proxy dynamique compatible **OpenAI** qui agrège tous les modèles **gratuits** d'[OpenRouter](https://openrouter.ai), avec failover automatique, dashboard d'administration et documentation intégrée.

## Fonctionnalités

- **Compatible OpenAI** — fonctionne avec n'importe quelle lib existante (`openai`, `litellm`, etc.)
- **31+ modèles LLM gratuits** récupérés en temps réel depuis OpenRouter
- **Failover automatique** — si un modèle échoue (timeout, 500...), le proxy bascule sur le suivant
- **Dashboard d'administration** — Vue d'ensemble, Config, API Docs, Logs, Historique
- **Sidebar rétractable** et interface 100% responsive (mobile / tablet / desktop)
- **Configuration dynamique** — timeout, intervalle de refresh, prompt système, mode de routage
- **Logs système** en temps réel avec filtres INFO / WARN / ERROR

## Démarrage rapide

### 1. Prérequis

- Node.js ≥ 18
- Clé API gratuite sur [openrouter.ai/keys](https://openrouter.ai/keys)

### 2. Installation

```bash
git clone https://github.com/iamarketings/free-llm-api.git
cd free-llm-api
npm install
```

### 3. Configuration

```bash
cp .env.example .env
# Éditez .env et renseignez votre OPENROUTER_API_KEY
```

### 4. Lancement

```bash
npm start
# ou en mode développement (hot-reload)
npm run dev
```

Le serveur démarre sur `http://localhost:8000`.

## Utilisation

### Dashboard Admin

Ouvrez `http://localhost:8000` dans votre navigateur.

### API — cURL

```bash
curl -s http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer any-key" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### API — Python (openai SDK)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="local"  # ignoré par le proxy
)

response = client.chat.completions.create(
    model="auto",
    messages=[{"role": "user", "content": "Explique les LLMs."}]
)
print(response.choices[0].message.content)
```

### API — Node.js

```js
const res = await fetch("http://localhost:8000/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer local" },
  body: JSON.stringify({
    model: "auto",
    messages: [{ role: "user", content: "Hello!" }]
  })
});
const data = await res.json();
console.log(data.choices[0].message.content);
```

## Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/v1/chat/completions` | Chat completion (format OpenAI) |
| `GET` | `/v1/models` | Liste des modèles actifs |
| `GET` | `/health` | Santé du service & métriques |
| `POST` | `/refresh` | Forcer le re-scan des modèles |
| `POST` | `/config` | Modifier la configuration |
| `GET` | `/` | Dashboard d'administration |

## Structure du projet

```
free-llm-api/
├── config/
│   └── index.js          # Constantes de configuration
├── controllers/
│   ├── adminController.js # Gestion admin (config, refresh, health)
│   ├── chatController.js  # Logique de chat & fallback
│   └── dashboardController.js
├── models/
│   └── modelManager.js   # Fetch, test & classification des modèles
├── routes/
│   └── index.js          # Routing Express
├── state/
│   ├── appState.js       # État global de l'application
│   └── persistence.js    # Persistance dans config.json
├── utils/
│   └── logger.js         # Système de logs centralisé
├── views/
│   └── dashboard.ejs     # UI Admin (EJS + Tailwind)
├── server.js             # Point d'entrée
├── .env.example          # Template de configuration
├── config.example.json   # Template de config runtime
└── package.json
```

## Variables d'environnement

| Variable | Requis | Défaut | Description |
|----------|--------|--------|-------------|
| `OPENROUTER_API_KEY` | ✅ | — | Clé API OpenRouter |
| `PORT` | ❌ | `8000` | Port du serveur HTTP |

## Configuration runtime (`config.json`)

Générée automatiquement au premier démarrage :

| Clé | Défaut | Description |
|-----|--------|-------------|
| `mode` | `auto` | `auto` (failover) ou `manual` (modèle fixe) |
| `fixed_model` | `null` | ID du modèle fixé en mode manuel |
| `system_prompt` | `""` | Prompt système global injecté dans chaque requête |
| `config_overrides.refresh_interval` | `15` | Minutes entre chaque scan des modèles |
| `config_overrides.request_timeout` | `10` | Secondes avant timeout par modèle |

## Licence

MIT © [iamarketings](https://github.com/iamarketings)
