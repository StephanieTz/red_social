#!/usr/bin/env bash
# Prepara una EC2 con Ubuntu 22.04/24.04 (una sola vez):  bash infra/ec2/setup.sh
# En Amazon Linux usa "dnf" en lugar de "apt" (docker: sudo dnf install -y docker git nginx).
set -euo pipefail

sudo apt-get update
sudo apt-get install -y git nginx certbot python3-certbot-nginx ca-certificates curl
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"      # cierra sesión y vuelve a entrar para que surta efecto
sudo systemctl enable --now docker nginx

# Memoria extra: una t2.small (2 GB) puede quedarse corta al compilar la imagen
if ! swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
fi
echo "✅ Servidor listo. Siguiente paso: clonar el repositorio y crear .env (ver docs/entregables/instrucciones_despliegue.md)"
