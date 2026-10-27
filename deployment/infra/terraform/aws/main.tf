data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }
}

locals {
  default_subnet = sort(data.aws_subnets.default.ids)[0]

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
  vpc_id      = data.aws_vpc.default.id

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
  vpc_id      = data.aws_vpc.default.id

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
  subnet_id              = each.value.subnet_id != "" ? each.value.subnet_id : local.default_subnet
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
