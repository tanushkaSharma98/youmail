# Assistant (Hugging Face) setup

The assistant needs a Hugging Face token with **permission to call Inference Providers**. A normal “read” token is not enough.

## Step-by-step

1. **Open the token creation page** (logged in to Hugging Face):
   - https://huggingface.co/settings/tokens
   - Click **“Create new token”** (or “New token”).

2. **Choose token type**
   - Select **“Fine-grained”** (not “Read” or “Write”).
   - Give it a name, e.g. `youmail-assistant`.

3. **Enable the right permission**
   - In the permissions list, find **“Inference”**.
   - Enable **“Make calls to Inference Providers”** (or similar wording).
   - You can leave other permissions off.

4. **Create and copy**
   - Click **“Generate token”**.
   - Copy the token (it starts with `hf_`). You won’t see it again.

5. **Set it in the backend**
   - Open `backend/.env`.
   - Set:
     ```bash
     HF_API_TOKEN=hf_YourTokenHere
     ```
   - Save the file.

6. **Restart the backend**
   - Stop the running server (Ctrl+C in the terminal where `poetry run python main.py` is running).
   - Start it again: `poetry run python main.py`.
   - Environment variables are read at startup; changing `.env` alone is not enough.

## Direct link

This link opens the new-token form with fine-grained type (you still must enable “Make calls to Inference Providers”):

https://huggingface.co/settings/tokens/new?ownUserPermissions=inference.serverless.write&tokenType=fineGrained

## Checklist

- [ ] Token type is **Fine-grained**
- [ ] Permission **“Make calls to Inference Providers”** is enabled
- [ ] `HF_API_TOKEN=hf_...` is set in `backend/.env`
- [ ] Backend was **restarted** after editing `.env`

If you still get a 503 about permissions, double-check the permission name in the token form and that you’re using the new token in `.env` and have restarted the server.
