const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");

router.get("/", userController.getHomePage);
router.get("/get-role/:wallet", userController.getRole);
router.post("/set-role", userController.setRole);
router.post("/register", userController.registerUser);
router.get("/user/:wallet", userController.getUser);
router.put("/user/:wallet", userController.updateUser);
router.post("/set-character", userController.setCharacter);
router.get("/maps/:wallet", userController.getMaps);
router.post("/maps/:wallet", userController.saveMap);
router.post("/assign-map", userController.assignMapToStudent); // New route
router.get("/quests/:wallet/:mapId", userController.getQuests);
router.post("/quests/start/:wallet", userController.startQuest);

module.exports = router;