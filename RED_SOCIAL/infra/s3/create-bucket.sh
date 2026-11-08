#!/usr/bin/env bash
# Crea el bucket PRIVADO de imágenes.   Uso: bash infra/s3/create-bucket.sh nombre-unico-del-bucket
# Requiere AWS CLI configurado con permisos de administrador (aws configure). Región del curso: us-east-1.
set -euo pipefail
B="${1:?Indica el nombre del bucket (único en todo AWS)}"
R="us-east-1"

aws s3api create-bucket --bucket "$B" --region "$R"
aws s3api put-public-access-block --bucket "$B" --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-encryption --bucket "$B" --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-bucket-versioning --bucket "$B" --versioning-configuration Status=Enabled   # recuperación ante borrados
echo "✅ Bucket $B creado (privado, cifrado, con versionado). Ponlo en .env → AWS_BUCKET_NAME"
