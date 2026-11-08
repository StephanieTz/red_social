# 9. Diagramas de Cloud Computing

## Despliegue en AWS (región N. Virginia, us-east-1)
```mermaid
flowchart TB
  Internet((Internet)) --> R53["Route 53<br/>zona + registro A"]
  R53 --> EIP[Elastic IP]
  subgraph VPC["VPC"]
    subgraph PUB["Subred pública"]
      EC2["EC2 t2.small<br/>nginx → Docker (app)"]
      SG{{"Security Group<br/>22 (mi IP) · 80 · 443"}}
    end
    EIP --> EC2
  end
  EC2 -->|IAM Role: red-social-ec2| S3[("S3 bucket privado<br/>SSE-AES256 + versionado")]
  EC2 -.->|IAM Role| REK[Rekognition]
  EC2 -->|TLS 5432| DB[("PostgreSQL<br/>Neon o RDS")]
  Admin(["Docente / Admin"]) -->|"IAM user limitado<br/>start/stop EC2"| EC2
```

## Modelo de servicio utilizado
| Recurso | Modelo | Nota |
|---|---|---|
| EC2 | IaaS | Se administra SO, Docker y nginx |
| S3, Rekognition, Route 53 | PaaS/SaaS gestionado | Sin servidores que mantener |
| PostgreSQL (Neon/RDS) | DBaaS | Respaldos gestionados |
| Google Identity, reCAPTCHA | SaaS | Terceros |

## Costos y cuidado
`t2.small` se cobra mientras está encendida: **suspéndela** al terminar (el enunciado lo exige). Una IP elástica sin instancia en ejecución también se cobra.
