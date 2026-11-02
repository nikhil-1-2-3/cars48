#!/bin/bash
# ─────────────────────────────────────────────────────────────
# EC2 Bootstrap — runs on first boot via cloud-init
# Installs: Docker, k3s (Kubernetes)
# CI/CD is handled by GitHub Actions — no Jenkins needed.
# ─────────────────────────────────────────────────────────────
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "==> Starting renthere bootstrap $(date)"

# ── System update ─────────────────────────────────────────────
apt-get update -y
apt-get install -y curl wget git unzip jq

# ── Docker ────────────────────────────────────────────────────
echo "==> Installing Docker"
curl -fsSL https://get.docker.com | sh
usermod -aG docker ubuntu
systemctl enable docker
systemctl start docker

# ── k3s (lightweight Kubernetes) ─────────────────────────────
echo "==> Installing k3s"
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
curl -sfL https://get.k3s.io | sh -s - --tls-san "$PUBLIC_IP"

# Make kubeconfig readable by ubuntu user
chmod 644 /etc/rancher/k3s/k3s.yaml
mkdir -p /home/ubuntu/.kube
cp /etc/rancher/k3s/k3s.yaml /home/ubuntu/.kube/config
chown ubuntu:ubuntu /home/ubuntu/.kube/config

# Replace 127.0.0.1 with the EC2 public IP so remote kubectl works
sed -i "s/127.0.0.1/$PUBLIC_IP/g" /home/ubuntu/.kube/config

# ── kubectl convenience for ubuntu user ──────────────────────
echo 'export KUBECONFIG=/home/ubuntu/.kube/config' >> /home/ubuntu/.bashrc

# ── Write DB info for reference when setting up k8s secrets ──
cat > /home/ubuntu/renthere-db-info.txt <<EOF
RDS Endpoint: ${db_endpoint}
DB Name:      ${db_name}
DB Username:  ${db_username}
DATABASE_URL: postgresql://${db_username}:${db_password}@${db_endpoint}:5432/${db_name}?schema=public

Next steps:
1. Check bootstrap: tail /var/log/user-data.log
2. Check k3s:       kubectl get nodes
3. Apply k8s secret: kubectl apply -f k8s/secret.yaml
4. Add KUBECONFIG_BASE64 to GitHub Actions secrets:
   cat ~/.kube/config | base64 -w 0
EOF
chown ubuntu:ubuntu /home/ubuntu/renthere-db-info.txt

echo "==> Bootstrap complete $(date)"
