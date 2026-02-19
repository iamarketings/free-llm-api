# 🚀 Free LLM API — Dynamic Proxy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18-green.svg)](https://nodejs.org/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-blue.svg)](https://github.com/iamarketings/free-llm-api/graphs/commit-activity)

> 🇫🇷 [Lire en Français](#-version-française) | 🇬🇧 [Read in English](#-english-version)

---

## 🇫🇷 Version Française

Un proxy intelligent et **compatible OpenAI** qui agrège automatiquement tous les modèles **gratuits** d'OpenRouter. Profitez d'un accès illimité aux LLMs avec une gestion intelligente des pannes.

### ✨ Points Forts

- **🔌 Plug & Play** : Entièrement compatible avec les SDK OpenAI (Python, JS, LangChain).
- **🤖 31+ Modèles Gratuits** : Récupération en temps réel des modèles disponibles sans frais.
- **🛡️ Failover Intelligent** : Si un modèle échoue ou freeze, le proxy bascule automatiquement sur le suivant.
- **📊 Dashboard Admin** : Interface web intégrée pour surveiller les logs, tester les modèles et configurer le serveur.
- **⚙️ Configuration Dynamique** : Modifiez le timeout, le prompt système ou le mode de routage sans redémarrer.

### 🛠️ Installation Rapide

**1. Cloner le projet**
```bash
git clone https://github.com/iamarketings/free-llm-api.git
cd free-llm-api
```

**2. Installer les dépendances**
```bash
npm install
```

**3. Configurer l'environnement**

Copiez le fichier exemple et renseignez votre clé :
```bash
cp .env.example .env
```
```env
OPENROUTER_API_KEY=votre_cle_ici
PORT=8000
```

**4. Lancement**
```bash
# Mode Production
npm start

# Mode Développement (Auto-reload)
npm run dev
```

🌐 Accédez au Dashboard sur : **http://localhost:8000**

### 🚀 Exemples d'Utilisation

**Via Python (SDK OpenAI)**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="sk-local"  # La clé locale est ignorée par le proxy
)

response = client.chat.completions.create(
    model="auto",  # Utilise le meilleur modèle gratuit disponible
    messages=[{"role": "user", "content": "Explique-moi la physique quantique."}]
)

print(response.choices[0].message.content)
```

**Via cURL**
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Salut !"}]
  }'
```

### 📂 Structure du Code

| Dossier | Rôle |
|---------|------|
| 📂 `controllers/` | Logique métier (Chat, Admin, Dashboard) |
| 📂 `models/` | Gestionnaire de modèles (Fetch & Test) |
| 📂 `views/` | Interface utilisateur (EJS + Tailwind) |
| 📂 `routes/` | Définition des points d'entrée API |
| 📂 `state/` | Gestion de l'état global et persistance JSON |
| 📂 `utils/` | Logger centralisé |

### ⚙️ Paramètres du `config.json`

Le fichier est généré automatiquement au premier lancement. Vous pouvez le modifier via le Dashboard :

- `mode` : `auto` (failover automatique) ou `manual` (modèle fixe).
- `system_prompt` : Instructions ajoutées automatiquement à chaque requête.
- `request_timeout` : Temps max (secondes) avant de passer au modèle suivant.
- `refresh_interval` : Fréquence (minutes) de mise à jour de la liste des modèles.

### 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une **Issue** ou une **Pull Request**.

---

## 🇬🇧 English Version

An intelligent, **OpenAI-compatible** proxy that automatically aggregates all **free** models from OpenRouter. Enjoy unlimited access to LLMs with smart failure handling.

### ✨ Key Features

- **🔌 Plug & Play**: Fully compatible with OpenAI SDKs (Python, JS, LangChain).
- **🤖 31+ Free Models**: Real-time fetching of all available no-cost models.
- **🛡️ Smart Failover**: If a model fails or freezes, the proxy automatically switches to the next one.
- **📊 Admin Dashboard**: Built-in web UI to monitor logs, test models and configure the server.
- **⚙️ Dynamic Config**: Change timeout, system prompt or routing mode without restarting.

### 🛠️ Quick Start

**1. Clone the repository**
```bash
git clone https://github.com/iamarketings/free-llm-api.git
cd free-llm-api
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment**

Copy the example file and fill in your key:
```bash
cp .env.example .env
```
```env
OPENROUTER_API_KEY=your_key_here
PORT=8000
```

**4. Run**
```bash
# Production
npm start

# Development (auto-reload)
npm run dev
```

🌐 Open the Dashboard at: **http://localhost:8000**

### 🚀 Usage Examples

**Python (OpenAI SDK)**
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:8000/v1",
    api_key="sk-local"  # local key is ignored by the proxy
)

response = client.chat.completions.create(
    model="auto",  # uses the best available free model
    messages=[{"role": "user", "content": "Explain quantum physics."}]
)

print(response.choices[0].message.content)
```

**Node.js / Fetch**
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

**cURL**
```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### 📂 Project Structure

| Folder | Role |
|--------|------|
| 📂 `controllers/` | Business logic (Chat, Admin, Dashboard) |
| 📂 `models/` | Model manager (Fetch & Test) |
| 📂 `views/` | UI templates (EJS + Tailwind) |
| 📂 `routes/` | API endpoint definitions |
| 📂 `state/` | Global state & JSON persistence |
| 📂 `utils/` | Centralized logger |

### 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/v1/chat/completions` | Chat completion (OpenAI format) |
| `GET` | `/v1/models` | List active models |
| `GET` | `/health` | Service health & metrics |
| `POST` | `/refresh` | Force model re-scan |
| `GET` | `/` | Admin dashboard |

### ⚙️ `config.json` Settings

Auto-generated on first run, editable via the Dashboard:

- `mode`: `auto` (smart failover) or `manual` (fixed model).
- `system_prompt`: Instructions automatically prepended to every request.
- `request_timeout`: Max seconds before switching to the next model.
- `refresh_interval`: Minutes between model list updates.

### 🤝 Contributing

Contributions are welcome! Feel free to open an **Issue** or a **Pull Request**.

---

## 📄 Licence / License

Distributed under the **MIT License** — see [LICENSE](LICENSE) for details.

---

Développé avec ❤️ par [iamarketings](https://github.com/iamarketings)
