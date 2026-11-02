# Terraform — AWS Infrastructure for RentHere

Provisions in one command:
- **VPC** with public subnets (EC2) and private subnets (RDS)
- **EC2** t3.small — auto-installs Docker, k3s, Jenkins on first boot
- **Elastic IP** — static IP that survives reboots
- **RDS PostgreSQL 16** — private, encrypted, automated backups
- **Security Groups** — least-privilege rules

## Prerequisites

1. [Terraform CLI](https://developer.hashicorp.com/terraform/install) >= 1.6
2. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) configured:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, region (ap-south-1), output format (json)
   ```
3. An EC2 Key Pair created in AWS Console → EC2 → Key Pairs
   - Download the `.pem` file to `~/.ssh/`
   - `chmod 400 ~/.ssh/renthere-key.pem`

## Usage

### 1. Fill in your values
```bash
cd terraform
cp terraform.tfvars terraform.tfvars   # already exists — just edit it
nano terraform.tfvars
```
Set:
- `ec2_key_pair_name` — name of your key pair in AWS
- `your_ip_cidr` — run `curl ifconfig.me` to get your IP, append `/32`
- `db_password` — a strong password (16+ chars, letters + numbers)

### 2. Init, plan, apply
```bash
terraform init
terraform plan    # review what will be created
terraform apply   # type 'yes' to confirm
```
Takes ~5 minutes. RDS takes the longest.

### 3. Read the outputs
```bash
terraform output                      # all values
terraform output ec2_public_ip        # your server IP
terraform output jenkins_url          # Jenkins URL
terraform output -raw database_url    # full DATABASE_URL (sensitive)
```

### 4. Wait for EC2 bootstrap to finish
The EC2 instance installs Docker + k3s + Jenkins on first boot. Watch progress:
```bash
# Get the SSH command
terraform output ec2_ssh_command

# SSH in and tail the log
ssh -i ~/.ssh/renthere-key.pem ubuntu@<EC2_IP>
tail -f /var/log/user-data.log
# Wait for: "==> Bootstrap complete"
```

### 5. Download the kubeconfig
```bash
terraform output -raw kubeconfig_update_command | bash
# This downloads the k3s kubeconfig to ~/.kube/renthere-config

export KUBECONFIG=~/.kube/renthere-config
kubectl get nodes   # should show 1 node Ready
```

### 6. Continue with k8s setup
Now go back to DEPLOYMENT.md Steps 5–10 to:
- Apply the Kubernetes Secret
- Add Jenkins credentials
- Set up the GitHub webhook
- Deploy Vercel frontend

## Destroying the infrastructure
```bash
# First: disable deletion protection on RDS
terraform apply -var="db_deletion_protection=false"
# Then destroy everything
terraform destroy
```
> Warning: this deletes all data including the RDS instance. The final snapshot is kept.

## Cost estimate (ap-south-1, monthly)
| Resource | Type | ~Cost |
|---|---|---|
| EC2 | t3.small | ~$15/mo |
| EBS (20 GB gp3) | Storage | ~$2/mo |
| RDS | db.t3.micro | ~$15/mo |
| RDS Storage (20 GB) | gp3 | ~$2/mo |
| Elastic IP | Static IP | ~$3/mo (free while attached) |
| Data transfer | Outbound | ~$1–5/mo |
| **Total** | | **~$35–40/mo** |
