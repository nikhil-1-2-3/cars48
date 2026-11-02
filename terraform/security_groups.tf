# ─────────────────────────────────────────────────────────────
# Security Groups
# ─────────────────────────────────────────────────────────────

# ── EC2 App Server (k3s + Jenkins) ───────────────────────────

resource "aws_security_group" "ec2" {
  name        = "renthere-ec2-sg"
  description = "Allow SSH, HTTP, HTTPS, Jenkins and k8s API"
  vpc_id      = aws_vpc.main.id

  # SSH — your IP only
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.your_ip_cidr]
  }

  # HTTP — public (k8s LoadBalancer backend traffic)
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # k3s API server — secured by mTLS client certificate in kubeconfig (needed for GitHub Actions CI/CD)
  ingress {
    description = "k3s API"
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # NodePort range — k3s LoadBalancer services
  ingress {
    description = "k3s NodePort"
    from_port   = 30000
    to_port     = 32767
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # All outbound allowed
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "renthere-ec2-sg" }
}

# ── RDS PostgreSQL ────────────────────────────────────────────

resource "aws_security_group" "rds" {
  name        = "renthere-rds-sg"
  description = "Allow PostgreSQL only from EC2"
  vpc_id      = aws_vpc.main.id

  # Only the EC2 security group can reach Postgres — not the public internet
  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "renthere-rds-sg" }
}
