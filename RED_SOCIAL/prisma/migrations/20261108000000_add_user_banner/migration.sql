-- Banner (imagen de portada) del perfil, como en YouTube. Guarda la clave del objeto en S3.
ALTER TABLE "users" ADD COLUMN "banner_key" VARCHAR(500);
