import Attendance from "../models/Attendance.js";

// GET all attendance records
export const getAllAttendance = async (req, res) => {
  try {
    const records = await Attendance.find();
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance", error });
  }
};

// POST new attendance
export const addAttendance = async (req, res) => {
  try {
    const { date, employee, status, reason } = req.body;

    if (!date || !employee || !status)
      return res.status(400).json({ message: "Missing required fields" });

    let existing = await Attendance.findOne({ date, employee });
    if (existing) {
      existing.status = status;
      existing.reason = reason;
      await existing.save();
      return res.json({ message: "Updated successfully", data: existing });
    }

    const newRecord = await Attendance.create({ date, employee, status, reason });
    res.status(201).json({ message: "Added successfully", data: newRecord });
  } catch (error) {
    res.status(500).json({ message: "Error saving attendance", error });
  }
};
