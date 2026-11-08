#!/usr/bin/env bash
# Actualiza la app en la EC2 con el último código de GitHub:  bash infra/ec2/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
git pull --ff-only
docker compose up -d --build
docker image prune -f
docker compose ps
