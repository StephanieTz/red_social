# IAM — roles y usuarios

| Archivo | Para qué |
|---|---|
| `ec2-role-policy.json` | Permisos del **rol de la EC2**: leer/escribir/borrar en el bucket y (opcional) Rekognition. Cambia `NOMBRE-DEL-BUCKET`. |
| `ec2-trust-policy.json` | Permite que EC2 use el rol. |
| `teacher-user-policy.json` | Usuario IAM **del docente**: ver, iniciar y detener instancias (Entregable 4). |

```bash
# Rol para la EC2 (una sola vez)
aws iam create-role --role-name red-social-ec2 --assume-role-policy-document file://infra/iam/ec2-trust-policy.json
aws iam put-role-policy --role-name red-social-ec2 --policy-name red-social-acceso --policy-document file://infra/iam/ec2-role-policy.json
aws iam create-instance-profile --instance-profile-name red-social-ec2
aws iam add-role-to-instance-profile --instance-profile-name red-social-ec2 --role-name red-social-ec2
aws ec2 associate-iam-instance-profile --instance-id i-XXXXXXXX --iam-instance-profile Name=red-social-ec2

# Usuario del docente
aws iam create-user --user-name docente
aws iam put-user-policy --user-name docente --policy-name docente-ec2 --policy-document file://infra/iam/teacher-user-policy.json
aws iam create-login-profile --user-name docente --password 'CONTRASEÑA-TEMPORAL' --password-reset-required
```
Las credenciales del docente se entregan por canal privado y se guardan en `privado/` (que no se sube a GitHub).
