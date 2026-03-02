# Create new Gmail OAuth credentials

Use this when you need a **new** OAuth 2.0 Client (e.g. new project or new client ID).

## 1. Google Cloud project

- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Create a **new project** (e.g. "youmail-dev") or select an existing one.

## 2. Enable Gmail API

- **APIs & Services** → **Library** → search **Gmail API** → **Enable**.

## 3. OAuth consent screen

- **APIs & Services** → **OAuth consent screen**.
- **User type:** External (or Internal for org-only).
- Fill **App name** (e.g. youmail), **User support email**, **Developer contact**.
- **Scopes:** Add Gmail scopes (e.g. `gmail.readonly`, `gmail.send`, `gmail.modify`) or “See all Gmail scopes” and pick the ones you need.
- **Save and continue** through the steps.
- **Important:** In **Test users**, click **+ ADD USERS** and add the Gmail address you will use to sign in (e.g. your personal Gmail). Otherwise you’ll get “Access blocked” when authorizing.

## 4. Create OAuth 2.0 Client ID

- **APIs & Services** → **Credentials** → **+ Create credentials** → **OAuth client ID**.
- **Application type:** **Desktop app**.
- **Name:** e.g. “youmail desktop”.
- **Create** → copy the **Client ID** and **Client secret** (or download JSON and take them from there).

## 5. Put values in `.env`

In the project’s `backend/.env`:

```env
GMAIL_CLIENT_ID=<paste Client ID here>
GMAIL_CLIENT_SECRET=<paste Client secret here>
```

Then run:

```bash
cd backend && poetry run python main.py
```

When the browser opens, sign in with the same Gmail you added as a **test user**. After that, the app will use the saved token and you won’t see the consent screen again unless the token is removed or expired.
