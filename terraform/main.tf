terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optional: store state in S3 so the team shares it.
  # Uncomment after creating the bucket manually (once).
  #
  # backend "s3" {
  #   bucket         = "renthere-terraform-state"
  #   key            = "prod/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "renthere-terraform-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "renthere"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
