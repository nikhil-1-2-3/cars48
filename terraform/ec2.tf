# ─────────────────────────────────────────────────────────────
# EC2 — App server running k3s (Kubernetes) + Jenkins
# ─────────────────────────────────────────────────────────────

# Latest Ubuntu 22.04 LTS AMI (official Canonical)
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.ec2_instance_type
  key_name               = var.ec2_key_pair_name
  subnet_id              = aws_subnet.public[0].id
  vpc_security_group_ids = [aws_security_group.ec2.id]

  # 20 GB root volume — enough for Docker images + k3s
  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  # Cloud-init user data: installs Docker, k3s, and Jenkins automatically
  user_data = templatefile("${path.module}/user_data.sh", {
    db_endpoint = aws_db_instance.postgres.address
    db_password = var.db_password
    db_name     = var.db_name
    db_username = var.db_username
  })

  # Ensure RDS is ready before EC2 boots (so user_data can reference it)
  depends_on = [aws_db_instance.postgres]

  tags = { Name = "renthere-app-server" }
}

# ── Elastic IP — static public IP that survives reboots ──────

resource "aws_eip" "app" {
  instance = aws_instance.app.id
  domain   = "vpc"
  tags     = { Name = "renthere-eip" }
}
