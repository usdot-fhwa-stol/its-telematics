output "region" {
  value = var.region
}

output "cloudwatch_log_group" {
  value = aws_cloudwatch_log_group.instances.name
}

output "instances" {
  description = "Per-instance details consumed by downstream automation."
  value = [
    for key in sort(keys(aws_instance.node)) : {
      id         = aws_instance.node[key].id
      role       = aws_instance.node[key].tags["Role"]
      public_ip  = aws_instance.node[key].public_ip
      private_ip = aws_instance.node[key].private_ip
      volume_ids = [aws_instance.node[key].root_block_device[0].volume_id]
      sg_ids     = tolist(aws_instance.node[key].vpc_security_group_ids)
    }
  ]
}
