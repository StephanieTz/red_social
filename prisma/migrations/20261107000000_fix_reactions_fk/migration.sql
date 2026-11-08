-- reactions.target_id apunta a publications O a comments (según "kind").
-- Las dos claves foráneas originales exigían que el id existiera en AMBAS tablas,
-- por lo que ningún like/dislike podía guardarse. Se eliminan; el código borra las reacciones huérfanas.
ALTER TABLE "reactions" DROP CONSTRAINT IF EXISTS "reaction_publication_fk";
ALTER TABLE "reactions" DROP CONSTRAINT IF EXISTS "reaction_comment_fk";
