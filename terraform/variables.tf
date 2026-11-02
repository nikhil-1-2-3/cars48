variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (prod, staging)"
  type        = string
  default     = "prod"
}

# ── EC2 ──────────────────────────────────────────────────────────────────────

variable "ec2_instance_type" {
  description = "EC2 instance type for the app server (k3s + Jenkins)"
  type        = string
  default     = "t3.small"
}

variable "ec2_key_pair_name" {
  description = "Name of an existing EC2 Key Pair for SSH access"
  type        = string
  # Set in terraform.tfvars — do not hardcode here
}

variable "your_ip_cidr" {
  description = "Your public IP in CIDR notation for SSH + Jenkins access (e.g. 1.2.3.4/32)"
  type        = string
  # Set in terraform.tfvars — do not hardcode here
}

# ── RDS ──────────────────────────────────────────────────────────────────────

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "cars48_db"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "cars48_user"
}

variable "db_password" {
  description = "RDS master password — stored in tfvars, never hardcoded"
  type        = string
  sensitive   = true
  # Set in terraform.tfvars
}

variable "db_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

# ── VPC ──────────────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets (EC2)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets (RDS)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}
