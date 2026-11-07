# Entregable 2 · Instrucciones de despliegue (AWS, región N. Virginia)

Prerrequisitos: cuenta AWS con la EC2 ya creada (Ubuntu, `t2.small`), AWS CLI configurado, un dominio (Route 53 o externo) y una base PostgreSQL (Neon o RDS).

## 1. Bucket S3 privado
```bash
bash infra/s3/create-bucket.sh nombre-unico-del-bucket
```

## 2. Rol IAM para la EC2 (sin claves en el servidor)
Sigue `infra/iam/README.md`: crea el rol `red-social-ec2` con `ec2-role-policy.json` (cambia `NOMBRE-DEL-BUCKET`) y asócialo a la instancia.

## 3. Security Group
Entrada: **22 solo desde tu IP**, 80 y 443 desde cualquier lugar. No abras 4000 ni 5432 (ver `docs/publica/04_segmentacion_red.md`).

## 4. Preparar el servidor (una sola vez)
```bash
ssh -i privado/llave_ssh.pem ubuntu@IP-DE-LA-EC2
git clone https://github.com/StephanieTz/red_social.git && cd red_social
bash infra/ec2/setup.sh          # Docker, nginx, certbot, swap de 2 GB
exit && ssh ...                  # reconecta para aplicar el grupo docker
```

## 5. Configurar variables
```bash
cd red_social && cp .env.example .env && nano .env
```
Completa: `JWT_SECRET` (genera uno largo), `DATABASE_URL`/`DIRECT_URL`, `STORAGE_DRIVER=s3`, `AWS_BUCKET_NAME`, `RECAPTCHA_SITE_KEY/SECRET`, `GOOGLE_CLIENT_ID`. Deja vacías `AWS_ACCESS_KEY_ID/SECRET` (usa el rol). Para Rekognition: `REKOGNITION_ENABLED=true`.
En `docker-compose.yml` cambia el puerto a `"127.0.0.1:4000:4000"`.

## 6. Dominio y HTTPS
1. Route 53 + IP elástica: `infra/route53/README.md`.
2. nginx: copia `infra/ec2/nginx.conf` a `/etc/nginx/sites-available/red_social` (cambia `TU-DOMINIO`), actívalo y ejecuta `sudo certbot --nginx -d TU-DOMINIO`.
3. En `.env`: `HTTPS=true` y `TRUST_PROXY=1`.
4. Registra el dominio en reCAPTCHA y como origen autorizado en Google Cloud (`https://TU-DOMINIO`).

## 7. Levantar la aplicación
```bash
docker compose up -d --build     # compila React, aplica migraciones y arranca
docker compose logs -f app       # debe decir: Conectado a PostgreSQL · Almacenamiento: s3
```
Actualizaciones futuras: `bash infra/ec2/deploy.sh`.

## 8. Usuario del docente (Entregable 4)
Crea el usuario IAM con `infra/iam/teacher-user-policy.json` (puede ver, iniciar y detener EC2). **Prueba el inicio de sesión** y guarda los datos en `privado/`. Guarda también la llave `.pem` (Entregable 5).

## 9. Lista de verificación antes de entregar
- [ ] Abrir `https://TU-DOMINIO`, crear una cuenta con reCAPTCHA y entrar con Google.
- [ ] Subir una foto: aparece la miniatura y, al abrirla, las 3 transformaciones.
- [ ] En la consola de S3 existen los 5 archivos bajo `photos/…` y el bucket sigue privado.
- [ ] `docker compose ps` muestra `app` en ejecución y `restart: unless-stopped`.
- [ ] Crear la AMI de respaldo (manual 7).
- [ ] **Suspender la instancia** (*Instance state → Stop*) para evitar cargos mientras el docente califica.

## Notas
- Las instrucciones de AWS no se han podido ejecutar contra la cuenta real durante el desarrollo; valídalas en la EC2 y corrige lo que difiera.
- Si el servidor tiene Amazon Linux en vez de Ubuntu, cambia `apt` por `dnf` en `setup.sh`.
