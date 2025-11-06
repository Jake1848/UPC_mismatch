# Vercel Deployment Guide: UPC Conflict Resolver SaaS

**A Step-by-Step Guide to Deploying Your Next.js Frontend and Express.js Backend to Vercel**

---

## 1. Introduction

This guide provides a comprehensive walkthrough for deploying your UPC Conflict Resolver application to Vercel. The application consists of a Next.js frontend and an Express.js backend, and this guide will show you how to configure your project for a seamless deployment experience.

Vercel is the ideal platform for this application, as it offers first-party support for Next.js and can run the Express.js backend as a serverless function. This provides a scalable, cost-effective, and easy-to-manage solution.

---

## 2. Prerequisites

Before you begin, ensure you have the following:

*   A Vercel account (you can sign up for free at [vercel.com](https://vercel.com))
*   The Vercel CLI installed (`npm install -g vercel`)
*   Your project code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

---

## 3. Project Structure

For Vercel to correctly build and deploy your application, your project should have a monorepo structure. The `UPC_mismatch` repository is already structured correctly, with the frontend in the root and the backend in the `server` directory.

```
/
├── src/                # Next.js frontend
├── server/             # Express.js backend
├── package.json        # Frontend dependencies
├── server/package.json # Backend dependencies
└── vercel.json         # Vercel configuration
```

---

## 4. Vercel Configuration (`vercel.json`)

Create a `vercel.json` file in the root of your project. This file will tell Vercel how to build and route your application.

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/src/app.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/src/app.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

### **Configuration Explained:**

*   **`builds`**: This array tells Vercel how to build the different parts of your application.
    *   The first build configuration tells Vercel to build the Express backend located at `server/src/app.ts` using the `@vercel/node` builder.
    *   The second build configuration tells Vercel to build the Next.js frontend using the `@vercel/next` builder.
*   **`routes`**: This array tells Vercel how to route incoming requests.
    *   The first route rewrites all requests to `/api/(.*)` to the Express backend.
    *   The second route serves the Next.js frontend for all other requests.

---

## 5. Deployment Steps

### **Step 1: Import Your Project to Vercel**

1.  Log in to your Vercel account.
2.  Click the "Add New..." button and select "Project".
3.  Import your Git repository.

### **Step 2: Configure Project Settings**

Vercel will automatically detect that you are deploying a Next.js application. You will need to configure the following settings:

*   **Build & Development Settings:**
    *   **Framework Preset:** Next.js
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `.next`
    *   **Install Command:** `npm install`
*   **Root Directory:** Leave this as the default (root of your project).

### **Step 3: Configure Environment Variables**

You will need to add the following environment variables to your Vercel project settings:

*   `DATABASE_URL`: Your PostgreSQL database connection string.
*   `FRONTEND_URL`: The URL of your deployed frontend (e.g., `https://your-project-name.vercel.app`).
*   `JWT_SECRET`: A secret key for signing JWTs.
*   `STRIPE_SECRET_KEY`: Your Stripe secret key.
*   `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret.

### **Step 4: Deploy**

Click the "Deploy" button. Vercel will now build and deploy your application. You can monitor the deployment progress in the Vercel dashboard.

---

## 6. Best Practices & Troubleshooting

*   **Database Connections:** Vercel's serverless functions can create multiple database connections. Ensure your database is configured to handle this, or use a connection pooling service like PgBouncer.
*   **Cold Starts:** Serverless functions can have "cold starts," which can cause a delay on the first request. For performance-critical applications, consider using Vercel's Pro plan with pre-warmed instances.
*   **Logging:** Use a logging service like Logtail or Datadog to monitor your application's logs. Vercel's built-in logging is also a good option for development.
*   **CORS:** The `cors` package is already configured in your Express backend. Ensure the `FRONTEND_URL` environment variable is set correctly to allow requests from your frontend.

---

## 7. Conclusion

By following this guide, you can successfully deploy your UPC Conflict Resolver application to Vercel. With its seamless integration with Next.js and serverless functions for your Express backend, Vercel provides a powerful and scalable platform for your SaaS product.

