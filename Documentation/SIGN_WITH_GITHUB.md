# Sign in with GitHub - Configuration & Setup Guide

This guide details the step-by-step procedure to configure and launch the secure "Sign in with GitHub" integration on your IoT Monitor dashboard.

---

## 1. Register a GitHub OAuth Application

To utilize the GitHub Authentication feature, you must register a new developer application on GitHub:

1. Log into your GitHub account and navigate to:
   **Settings ➔ Developer Settings ➔ OAuth Apps**
2. Click the **New OAuth App** button (or **Register a new application**).
3. Fill out the application details:
   - **Application Name:** `IoT Monitor Dashboard`
   - **Homepage URL:** `http://localhost:8000` (or `http://127.0.0.1:8000`)
   - **Application Description:** `Secure admin access and workspace integration client.`
   - **Authorization Callback URL:** `http://127.0.0.1:8000/github/callback`
   
   > [!IMPORTANT]
   > The callback URL port must match the **Express Web Host Port** configured in your Application Settings (default `8000`). If you alter the web host port, update the authorization callback URL on GitHub accordingly.

4. Click **Register Application**.

---

## 2. Obtain Your Credentials

Upon registering, GitHub will generate your application credentials:

1. Copy the **Client ID** displayed on your OAuth App dashboard page.
2. Under **Client Secrets**, click **Generate a new client secret**.
3. Copy the newly generated **Client Secret** immediately.
   
   > [!WARNING]
   > The Client Secret is only displayed once. Save it securely.

---

## 3. Configure the Application Settings

Open the IoT Monitor Dashboard:

1. Click on the **App Settings** view (gear icon) in the navigation pane.
2. Locate the **GitHub OAuth Integration** card.
3. Paste your copied **GitHub Client ID** and **GitHub Client Secret** into the respective text input fields.
4. Click **Save GitHub Credentials**.
5. Restart the application for settings to persist and the authentication ports to bind cleanly.

---

## 4. Run Sign In

1. Go to the **App Settings** view or click on any GitHub trigger.
2. Click **Sign in with GitHub**.
3. A secure browser popup window will open loading GitHub's authorization page.
4. Log in and authorize the application. The browser popup will close automatically, and your workspace will display your authenticated GitHub credentials.
