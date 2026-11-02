# ─────────────────────────────────────────────────────────────
# RDS — Managed PostgreSQL 16
# ─────────────────────────────────────────────────────────────

# RDS requires a subnet group spanning at least 2 AZs
resource "aws_db_subnet_group" "postgres" {
  name       = "renthere-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "renthere-db-subnet-group" }
}

resource "aws_db_instance" "postgres" {
  identifier        = "renthere-db"
  engine            = "postgres"
  engine_version    = "16.9"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.postgres.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # No public access — only reachable from within the VPC (EC2)
  publicly_accessible = false

  # Free tier: backups must be disabled (retention = 0)
  # Upgrade your AWS account to enable automated backups
  backup_retention_period = 0
  maintenance_window      = "Mon:04:00-Mon:05:00"

  # Prevent accidental deletion via terraform destroy
  deletion_protection = true

  # Set to true for zero-downtime minor version updates
  auto_minor_version_upgrade = true

  # Skip final snapshot on destroy (set to false + provide name in production)
  skip_final_snapshot = false
  final_snapshot_identifier = "renthere-db-final-snapshot"

  tags = { Name = "renthere-postgres" }
}
