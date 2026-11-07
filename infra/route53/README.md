# Route 53 — dominio y DNS

1. Route 53 → *Hosted zones* → crear zona para tu dominio (o registrar uno en *Registered domains*).
2. EC2 → *Elastic IPs* → asignar una IP elástica a la instancia (así la IP no cambia al suspender/reanudar).
3. Registro **A** `TU-DOMINIO → IP elástica`:
   `aws route53 change-resource-record-sets --hosted-zone-id ZXXXXXXXX --change-batch file://infra/route53/change-batch.json`
4. Si el dominio es de otro registrador, copia los 4 *name servers* de la zona de Route 53 en ese registrador.
5. Con el dominio funcionando: HTTPS con certbot (ver `infra/ec2/nginx.conf`) y registra el dominio en
   reCAPTCHA y como *origen autorizado* en Google Cloud (Google Login no acepta IPs, solo dominios y localhost).

⚠️ Una IP elástica sin instancia en ejecución se cobra por hora; libérala al terminar el curso.
