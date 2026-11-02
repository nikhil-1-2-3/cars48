# RentHere / FleetFlow — Deployment Guide
## Architecture: Vercel (Frontend) + EC2/k3s (Backend) + RDS PostgreSQL + GitHub Actions (CI/CD)

```
git push to main
       │
       ▼
GitHub Actions (.github/workflows/deploy.yml)
  ├── Build singhnikhil212/renthere-backend:<sha>  ──► Docker Hub
  ├── Build singhnikhil212/renthere-frontend:<sha> ──► Docker Hub
  └── kubectl apply k8s/ ──► EC2 k3s cluster (rolling update)
                                   └── backend Pods × 2
                                            │
                                            ▼
                                   AWS RDS PostgreSQL 16.9
                                   (renthere-db.cryiosy0qqq2.ap-south-1.rds.amazonaws.com)

Vercel (automatic on push to main — separate integration)
  └── npm run build (frontend/) ──► CDN
            └── VITE_API_BASE_URL → EC2 LoadBalancer → backend pods → RDS
```

---

## Infrastructure (already provisioned via Terraform)

| Resource | Value |
|---|---|
| EC2 Public IP | `3.111.166.41` |
| RDS Endpoint | `renthere-db.cryiosy0qqq2.ap-south-1.rds.amazonaws.com` |
| DB Name | `cars48_db` |
| DB Username | `cars48_user` |
| SSH | `ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41` |
| Region | `ap-south-1` |

---

## Step 1 — Wait for EC2 to finish bootstrapping

```bash
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41
tail -f /var/log/user-data.log
# Wait for: "==> Bootstrap complete"

# Then verify k3s is running
kubectl get nodes   # should show: Ready
```

---

## Step 2 — Get the kubeconfig for GitHub Actions

```bash
# Still SSH'd into EC2:
cat ~/.kube/config | base64 -w 0
# Copy the entire output — this is KUBECONFIG_BASE64
```

---

## Step 3 — Add GitHub Actions Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add these 3 secrets:

| Secret Name | Value |
|---|---|
| `DOCKERHUB_USERNAME` | `singhnikhil212` |
| `DOCKERHUB_TOKEN` | Your Docker Hub access token (Hub → Account Settings → Security → New Access Token) |
| `KUBECONFIG_BASE64` | Output of `cat ~/.kube/config \| base64 -w 0` from Step 2 |

---

## Step 4 — Apply the Kubernetes Secret

The k8s Secret holds all backend env vars (RDS URL, JWT, Razorpay, etc.).
It is never committed to Git — apply it once manually.

```bash
# On your local machine, from the project root:
chmod +x scripts/generate-secret.sh
./scripts/generate-secret.sh
```

When prompted:
- RDS Endpoint: `renthere-db.cryiosy0qqq2.ap-south-1.rds.amazonaws.com`
- RDS Password: `RentHere2026Db99`
- Google Client ID: your real one from console.cloud.google.com
- Razorpay keys: from dashboard.razorpay.com
- SMTP: your Gmail + App Password
- Frontend URL: your Vercel URL (e.g. `https://cars48.vercel.app`)

Then apply to the cluster:
```bash
scp -i ~/.ssh/renthere-key.pem k8s/secret.yaml ubuntu@15.252.223.37:/tmp/
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 \
  "kubectl apply -f /tmp/secret.yaml && rm /tmp/secret.yaml"
```

Verify:
```bash
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 \
  "kubectl get secret renthere-secrets"
```

---

## Step 5 — Deploy Vercel Frontend

1. Go to [vercel.com](https://vercel.com) → **Add New Project** → import your GitHub repo
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. **Environment Variable:**
   ```
   VITE_API_BASE_URL = http://3.111.166.41
   ```
   (After first deploy you'll replace this with the k8s LoadBalancer external IP)
6. Deploy

After first GitHub Actions deploy, get the actual LoadBalancer IP:
```bash
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 \
  "kubectl get svc renthere-backend-service"
# Copy EXTERNAL-IP
```
Update `VITE_API_BASE_URL` in Vercel to that IP and redeploy.

---

## Step 6 — Trigger First Deploy

```bash
cd /home/nikhil-singh/projects/rent/cars48
git add .
git commit -m "CI/CD: GitHub Actions + k8s + Terraform + Prisma migrations"
git push origin main
```

Watch the pipeline at: `https://github.com/YOUR_USERNAME/cars48/actions`

The workflow does:
1. Build `renthere-backend:<sha>` → push to Docker Hub (parallel with frontend)
2. Build `renthere-frontend:<sha>` → push to Docker Hub
3. `kubectl apply -f k8s/` → rolling update on EC2
4. `kubectl rollout status` → waits for pods to be ready
5. Run `db-migrate-job` → `prisma migrate deploy` against RDS
6. Print pod + service status

---

## Day-2 Operations

```bash
# Check running pods
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 "kubectl get pods"

# Check logs
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 \
  "kubectl logs -l app=renthere-backend --tail=50"

# Manual rollback to previous image
ssh -i ~/.ssh/renthere-key.pem ubuntu@3.111.166.41 \
  "kubectl rollout undo deployment/renthere-backend"

# Re-run migrations manually
ssh -i ~/.ssh/renthere-key.pem ubuntu@15.252.223.37 \
  "kubectl delete job renthere-db-migrate --ignore-not-found && \
   kubectl apply -f -" < k8s/db-migrate-job.yaml
```

---

## GitHub Actions Secrets Summary

| Secret | Where to get it |
|---|---|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub → Account Settings → Security → New Access Token |
| `KUBECONFIG_BASE64` | `cat ~/.kube/config \| base64 -w 0` on the EC2 instance |
