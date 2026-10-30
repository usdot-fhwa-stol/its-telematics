variable "region" {
  type    = string
  default = "us-east-1"
}

variable "aws_profile" {
  type    = string
  default = "default"
}

variable "public_key_path" {
  description = "Path to the SSH public key registered as the instance key pair."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR block of the telematics VPC; the public subnet is carved from it."
  type        = string
  default     = "10.20.0.0/16"
}

variable "name_prefix" {
  type    = string
  default = "telematics"
}

# Empty ami_id / subnet_id trigger auto-discovery (Ubuntu 22.04 LTS / telematics VPC public subnet).
variable "nodes" {
  description = "Node role => hardware profile."
  type = map(object({
    instance_type        = string
    instance_count       = number
    ami_id               = string
    subnet_id            = string
    root_volume_size_gib = number
    volume_type          = string
    public_web           = bool
  }))
}
