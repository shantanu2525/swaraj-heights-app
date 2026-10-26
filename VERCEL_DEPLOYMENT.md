# Vercel Production Setup

The app reads the Google Apps Script backend from this Vite variable:

```text
VITE_APPS_SCRIPT_URL
```

## Add It In Vercel

1. Open your project in the Vercel dashboard.
2. Open **Settings -> Environment Variables**.
3. Add this variable:

```text
Name: VITE_APPS_SCRIPT_URL
Value: https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
Environment: Production
```

4. Save the variable.
5. Redeploy the Production deployment. Environment-variable changes only
   apply to new deployments.

For this project's current test backend, the value is:

```text
https://script.google.com/macros/s/AKfycbxcAmKPmcPte9jGG8zH14nXfyV2TQWkzjRBNXy2TIF9yVhzyKch0HbnOYbp5jIj6eCyyA/exec
```

## Optional CLI Setup

After installing/logging into the Vercel CLI and linking the project:

```bash
printf '%s' 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec' \
  | npx vercel env add VITE_APPS_SCRIPT_URL production
npx vercel --prod
```

`VITE_` values are embedded into the browser build and are not secrets. The
Apps Script URL must already be deployed with the access level required by
the application.