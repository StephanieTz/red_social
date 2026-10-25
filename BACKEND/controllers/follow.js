const Follow = require("../models/follow");
const User = require("../models/user");

const pruebaFollows = (req, res) => {
    return res.status(200).send({ message: "Prueba follows OK" });
};

const follow = async (req, res) => {
    try {
        // Verificar que req.user exista
        if (!req.user || !req.user.id) {
            return res.status(401).json({ status: "error", message: "Usuario no autenticado" });
        }

        const { followed_user } = req.body;

        if (!followed_user) {
            return res.status(400).json({ status: "error", message: "Falta el ID del usuario a seguir" });
        }

        if (req.user.id === followed_user) {
            return res.status(400).json({ status: "error", message: "No puedes seguirte a ti mismo" });
        }

        const newFollow = new Follow({ 
            follower_user: req.user.id, 
            followed_user 
        });
        
        await newFollow.save();
        
        return res.status(201).json({ 
            status: "success", 
            message: "Siguiendo al usuario correctamente" 
        });
    } catch (error) {
        console.error("ERROR EN FOLLOW:", error);
        return res.status(500).json({ 
            status: "error", 
            message: "Error al seguir", 
            error: error.message 
        });
    }
};

const unfollow = async (req, res) => {
    try {
        await Follow.findOneAndDelete({ 
            follower_user: req.user.id, 
            followed_user: req.params.id 
        });
        
        return res.status(200).json({ 
            status: "success", 
            message: "Has dejado de seguir al usuario" 
        });
    } catch (error) {
        return res.status(500).json({ 
            status: "error", 
            message: "Error al dejar de seguir", 
            error: error.message 
        });
    }
};

const followers = async (req, res) => {
    try {
        const userId = req.params.id;
        const follows = await Follow.find({ followed_user: userId })
            .populate("follower_user", "name nick image");
        
        return res.status(200).json({ 
            status: "success", 
            count: follows.length, 
            followers: follows 
        });
    } catch (error) {
        return res.status(500).json({ 
            status: "error", 
            message: "Error al obtener seguidores", 
            error: error.message 
        });
    }
};

const following = async (req, res) => {
    try {
        const userId = req.params.id;
        const follows = await Follow.find({ follower_user: userId })
            .populate("followed_user", "name nick image");
        
        return res.status(200).json({ 
            status: "success", 
            count: follows.length, 
            following: follows 
        });
    } catch (error) {
        return res.status(500).json({ 
            status: "error", 
            message: "Error al obtener seguidos", 
            error: error.message 
        });
    }
};

module.exports = { pruebaFollows, follow, unfollow, followers, following };