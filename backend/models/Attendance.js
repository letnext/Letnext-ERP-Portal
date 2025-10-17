import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  employee: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Half Day","Training","Holiday"],
    required: true,
  },
  reason: {
    type: String,
    default: "",
  },
});

const Attendance = mongoose.model("Attendance", attendanceSchema);
export default Attendance;
