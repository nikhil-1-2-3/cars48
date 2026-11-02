# ─────────────────────────────────────────────────────────────
# Outputs — printed after terraform apply
# ─────────────────────────────────────────────────────────────

output "ec2_public_ip" {
  description = "Static public IP of the app server (EC2 + Elastic IP)"
  value       = aws_eip.app.public_ip
}

output "ec2_ssh_command" {
  description = "SSH command to connect to the EC2 instance"
  value       = "ssh -i ~/.ssh/${var.ec2_key_pair_name}.pem ubuntu@${aws_eip.app.public_ip}"
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint (private — only reachable from EC2)"
  value       = aws_db_instance.postgres.address
  sensitive   = false
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.postgres.port
}

output "database_url" {
  description = "Full DATABASE_URL for the backend (use this in k8s secret)"
  value       = "postgresql://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:5432/${var.db_name}?schema=public"
  sensitive   = true
}

output "kubeconfig_update_command" {
  description = "Command to update your local kubeconfig to point at this cluster"
  value       = "scp -i ~/.ssh/${var.ec2_key_pair_name}.pem ubuntu@${aws_eip.app.public_ip}:/home/ubuntu/.kube/config ~/.kube/renthere-config"
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}
