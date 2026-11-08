# 2. Diagrama distribuido de componentes

```mermaid
flowchart LR
  U([👤 Usuario<br/>navegador]) -->|HTTPS| R53[Route 53<br/>DNS]
  R53 --> N
  subgraph EC2["EC2 t2.small (Ubuntu + Docker)"]
    N[nginx<br/>TLS + proxy] --> A["Contenedor app<br/>Node/Express 5<br/>React compilado + API"]
  end
  A -->|Prisma / TLS| DB[(PostgreSQL<br/>cuentas, metadatos, auditoría)]
  A -->|SDK S3 · IAM Role| S3[(Amazon S3<br/>bucket privado<br/>original + miniatura + 3 transf.)]
  A -.->|opcional| REK[Amazon Rekognition]
  U -->|ID token| GG[Google Identity]
  A -->|verifica token| GG
  U -->|desafío| RC[Google reCAPTCHA]
  A -->|siteverify| RC
```

## Componentes
| Componente | Rol | Código |
|---|---|---|
| Frontend React | UI y detección de rostros en el cliente | `FRONTEND/src` |
| API Express | Rutas, autenticación, procesamiento, auditoría | `BACKEND/` |
| sharp | Miniaturas y transformaciones | `services/images.js` |
| storage | Abstracción S3 / disco | `services/storage.js` |
| PostgreSQL | Datos relacionales | `prisma/schema.prisma` |
| S3 | Archivos de imagen | `infra/s3/create-bucket.sh` |
| IAM Role | Acceso de la EC2 a S3/Rekognition sin claves | `infra/iam/` |
| Route 53 | Dominio | `infra/route53/` |
