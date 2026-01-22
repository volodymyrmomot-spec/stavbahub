const router = require("express").Router();
const auth = require("../middleware/auth");
const ctrl = require("../controllers/messageController");

router.get("/threads", auth(), ctrl.getThreads);
router.get("/with/:userId", auth(), ctrl.getChatWithUser);
router.post("/send", auth(), ctrl.sendMessage);
router.post("/mark-read", auth(), ctrl.markRead);

module.exports = router;
