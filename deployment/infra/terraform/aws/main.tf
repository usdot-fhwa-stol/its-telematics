data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "telematics" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.name_prefix}-vpc"
  }
}

resource "aws_internet_gateway" "telematics" {
  vpc_id = aws_vpc.telematics.id

  tags = {
    Name = "${var.name_prefix}-igw"
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.telematics.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, 0)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.name_prefix}-public"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.telematics.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.telematics.id
  }

  tags = {
    Name = "${var.name_prefix}-public"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Official Canonical AWS Account ID for public AMIs

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"] #  currently tested version is ubuntu-22, but deployment can also use 20 and 24.
  }
}

locals {
  # One entry per instance, keyed "<role>-<index>"
  instances = merge([
    for role, node in var.nodes : {
      for i in range(node.instance_count) : "${role}-${i}" => merge(node, { role = role })
    }
  ]...)
}

resource "aws_key_pair" "this" {
  key_name_prefix = "${var.name_prefix}-"
  public_key      = file(pathexpand(var.public_key_path))
}

resource "aws_security_group" "cluster_internal" {
  name_prefix = "${var.name_prefix}-cluster-internal-"
  vpc_id      = aws_vpc.telematics.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "All traffic between cluster nodes"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "ui_web" {
  name_prefix = "${var.name_prefix}-ui-web-"
  vpc_id      = aws_vpc.telematics.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_cloudwatch_log_group" "instances" {
  name              = "/${var.name_prefix}/instances"
  retention_in_days = 14
}

data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "instance" {
  name_prefix        = "${var.name_prefix}-instance-"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "cloudwatch_agent" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "instance" {
  name_prefix = "${var.name_prefix}-instance-"
  role        = aws_iam_role.instance.name
}

resource "aws_instance" "node" {
  for_each = local.instances

  ami                    = each.value.ami_id != "" ? each.value.ami_id : data.aws_ami.ubuntu.id
  instance_type          = each.value.instance_type
  subnet_id              = each.value.subnet_id != "" ? each.value.subnet_id : aws_subnet.public.id
  key_name               = aws_key_pair.this.key_name
  monitoring             = true # detailed CloudWatch metrics (1-minute)
  iam_instance_profile   = aws_iam_instance_profile.instance.name
  vpc_security_group_ids = concat([aws_security_group.cluster_internal.id], each.value.public_web ? [aws_security_group.ui_web.id] : [])

  # Ship syslog to CloudWatch Logs; the stream name is the instance ID.
  user_data = <<-EOT
    #!/bin/bash
    set -e
    cd /tmp
    curl -fsSLO https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    dpkg -i -E ./amazon-cloudwatch-agent.deb
    cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json <<'CFG'
    {"logs":{"logs_collected":{"files":{"collect_list":[
      {"file_path":"/var/log/syslog","log_group_name":"${aws_cloudwatch_log_group.instances.name}","log_stream_name":"{instance_id}"}
    ]}}}}
    CFG
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
  EOT

  root_block_device {
    volume_size = each.value.root_volume_size_gib
    volume_type = each.value.volume_type
  }

  tags = {
    Name = "${var.name_prefix}-${each.key}"
    Role = each.value.role
  }

  lifecycle {
    postcondition {
      condition     = self.monitoring && self.iam_instance_profile != ""
      error_message = "CloudWatch monitoring and the CloudWatch agent instance profile must be enabled on every instance."
    }
  }
}
