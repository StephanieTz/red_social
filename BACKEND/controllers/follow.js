const prisma = require("../database/prisma");

const pruebaFollows = (req, res) => res.status(200).send({ message: "Prueba follows OK" });
const formatUser = (u) => u ? { ...u, _id: u.id, image: u.imageKey } : u;

const follow = async (req, res) => {
  try {
    const { followed_user } = req.body;
    if (!followed_user) return res.status(400).json({ status: "error", message: "Falta el ID del usuario a seguir" });
    if (req.user.id === followed_user) return res.status(400).json({ status: "error", message: "No puedes seguirte a ti mismo" });

    await prisma.follow.create({
      data: { followerId: req.user.id, followedId: followed_user }
    });
    return res.status(201).json({ status: "success", message: "Siguiendo al usuario correctamente" });
  } catch (e) {
    return res.status(500).json({ status: "error", message: "Error al seguir o ya lo sigues" });
  }
};

const unfollow = async (req, res) => {
  try {
    await prisma.follow.delete({
      where: { followerId_followedId: { followerId: req.user.id, followedId: req.params.id } }
    });
    return res.status(200).json({ status: "success", message: "Has dejado de seguir al usuario" });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Error al dejar de seguir" });
  }
};

const followers = async (req, res) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followedId: req.params.id },
      include: { follower: { select: { id: true, name: true, nick: true, imageKey: true } } }
    });
    return res.status(200).json({ 
      status: "success", 
      count: follows.length, 
      followers: follows.map(f => ({ ...f, follower_user: formatUser(f.follower) })) 
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Error al obtener seguidores" });
  }
};

const following = async (req, res) => {
  try {
    const follows = await prisma.follow.findMany({
      where: { followerId: req.params.id },
      include: { followed: { select: { id: true, name: true, nick: true, imageKey: true } } }
    });
    return res.status(200).json({ 
      status: "success", 
      count: follows.length, 
      following: follows.map(f => ({ ...f, followed_user: formatUser(f.followed) })) 
    });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Error al obtener seguidos" });
  }
};

module.exports = { pruebaFollows, follow, unfollow, followers, following };