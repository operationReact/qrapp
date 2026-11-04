# Backend bucket is chosen during terraform init, from the new account bootstrap.
# No hardcoded old-account bucket names or deprecated DynamoDB locking.
terraform {
  backend "s3" {}
}
