import express from "express";
import { getAllAttendance, addAttendance } from "../controllers/attendanceController.js";

const router = express.Router();

router.get("/", getAllAttendance);
router.post("/", addAttendance);

export default router;
