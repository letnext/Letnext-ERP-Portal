import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import "./attendance.css";

const Attendance = () => {
  const [employees, setEmployees] = useState([
    "Anusri C",
    "Deepak S",
    "Deepan R",
    "Dheeraj C",
    "Gokulakrishnan M",
    "Jatheeswaran S",
    "Kiruthikrosan",
    "Krishna Suthers Raj T G B",
    "Sridharan B",
    "Tarun S",
    "Vijayakumar M",
    "Kavin Adithya S R",
    "Sanjitha S"
    
  ]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [reasonInput, setReasonInput] = useState({
    name: null,
    status: null,
    reason: "",
    isVisible: false,
  });
  const [newEmployeeName, setNewEmployeeName] = useState("");

  const backendURL = "http://localhost:5000/api/attendance";

  // 🟢 Fetch all attendance data from backend
  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch(backendURL);
        const data = await res.json();

        const grouped = data.reduce((acc, record) => {
          if (!acc[record.date]) acc[record.date] = {};
          acc[record.date][record.employee] = {
            status: record.status,
            reason: record.reason || "",
          };
          return acc;
        }, {});
        setAttendance(grouped);
      } catch (err) {
        console.error("Failed to fetch attendance:", err);
      }
    };
    fetchAttendance();
  }, []);

  const handleAttendanceClick = (name, status) => {
    if (status === "Present") {
      updateAttendance(name, status, "");
    } else {
      setReasonInput({
        name,
        status,
        reason: "",
        isVisible: true,
      });
    }
  };

  const handleReasonSubmit = () => {
    const { name, status, reason } = reasonInput;
    if (reason.trim() === "") {
      alert("Please enter a reason.");
      return;
    }
    updateAttendance(name, status, reason.trim());
    setReasonInput({
      name: null,
      status: null,
      reason: "",
      isVisible: false,
    });
  };

  // 🟡 Save attendance both locally and in backend
  const updateAttendance = async (name, status, reason) => {
    const newAttendance = {
      ...attendance,
      [selectedDate]: {
        ...(attendance[selectedDate] || {}),
        [name]: { status, reason },
      },
    };
    setAttendance(newAttendance);

    try {
      await fetch(backendURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          employee: name,
          status,
          reason,
        }),
      });
    } catch (err) {
      console.error("Failed to save attendance:", err);
    }
  };

  const getRecord = (name) => {
    const record = attendance[selectedDate]?.[name];
    if (record && record.status) {
      return record;
    }
    return { status: "Not Marked", reason: "" };
  };

  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return "Select a date";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (newEmployeeName.trim() !== "") {
      const isDuplicate = employees.some(
        (employee) =>
          employee.toLowerCase() === newEmployeeName.trim().toLowerCase()
      );

      if (isDuplicate) {
        alert("Employee with this name already exists!");
        setNewEmployeeName("");
        return;
      }

      setEmployees([...employees, newEmployeeName.trim()]);
      setNewEmployeeName("");
    }
  };

  // 🧾 Excel Export Handlers
  const exportToExcel = (type) => {
    const records = [];

    Object.keys(attendance).forEach((date) => {
      const recordDate = new Date(date);
      const month = recordDate.getMonth() + 1;
      const year = recordDate.getFullYear();

      if (
        (type === "month" &&
          month === new Date(selectedDate).getMonth() + 1 &&
          year === new Date(selectedDate).getFullYear()) ||
        (type === "year" && year === new Date(selectedDate).getFullYear())
      ) {
        employees.forEach((emp) => {
          const rec = attendance[date]?.[emp];
          records.push({
            Date: date,
            Employee: emp,
            Status: rec?.status || "Not Marked",
            Reason: rec?.reason || "",
          });
        });
      }
    });

    if (records.length === 0) {
      alert("No data found for this period.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      type === "month" ? "Month Data" : "Year Data"
    );

    const fileName =
      type === "month"
        ? `Attendance_${new Date(selectedDate).toLocaleString("default", {
            month: "long",
          })}_${new Date(selectedDate).getFullYear()}.xlsx`
        : `Attendance_${new Date(selectedDate).getFullYear()}.xlsx`;

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      fileName
    );
  };

  return (
    <div className="attendance-container">
      <div className="attendance-header">
        <h1 className="attendance-title">Daily Attendance Tracker</h1>
        <div className="date-picker">
          <label htmlFor="attendance-date-input" className="date-label">
            Select Date:
          </label>
          <input
            type="date"
            id="attendance-date-input"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="date-input"
          />
        </div>
        <p className="attendance-date">
          Currently Viewing: <span>{formatDateForDisplay(selectedDate)}</span>
        </p>
      </div>

      <div className="add-employee-form">
        <form onSubmit={handleAddEmployee}>
          <input
            type="text"
            value={newEmployeeName}
            onChange={(e) => setNewEmployeeName(e.target.value)}
            placeholder="New employee name"
            className="employee-input"
          />
          <button type="submit" className="add-employee-btn">
            Add Employee
          </button>
        </form>
      </div>

      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((person, index) => {
              const record = getRecord(person);
              return (
                <tr key={index}>
                  <td data-label="Name">{person}</td>
                  <td
                    data-label="Status"
                    className={`status-cell status-${(record.status || "not-marked")
                      .toLowerCase()
                      .replace(" ", "-")}`}
                  >
                    <div>{record.status}</div>
                    {record.reason && (
                      <div className="reason">({record.reason})</div>
                    )}
                    <div className="action-buttons-cell">
                      <button
                        onClick={() => handleAttendanceClick(person, "Present")}
                        className={`present-btn ${
                          record.status === "Present" ? "active" : ""
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => handleAttendanceClick(person, "Absent")}
                        className={`absent-btn ${
                          record.status === "Absent" ? "active" : ""
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() =>
                          handleAttendanceClick(person, "Traning")
                        }
                        className={`training-btn ${
                          record.status === "Traning" ? "active" : ""
                        }`}
                      >
                        Training
                      </button>
                      <button
                        onClick={() =>
                          handleAttendanceClick(person, "Half Day")
                        }
                        className={`halfday-btn ${
                          record.status === "Half Day" ? "active" : ""
                        }`}
                      >
                        Half Day
                      </button>
                      <button
                        onClick={() =>
                          handleAttendanceClick(person, "Holiday")
                        }
                        className={`holiday-btn ${
                          record.status === "Holiday" ? "active" : ""
                        }`}
                      >
                        Holiday
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🧾 Excel Export Buttons */}
      <div className="download-container">
        <button
          onClick={() => exportToExcel("month")}
          className="download-btn"
        >
          Download Monthly Report
        </button>
        <button onClick={() => exportToExcel("year")} className="download-btn">
          Download Yearly Report
        </button>
      </div>

      {reasonInput.isVisible && (
        <div className="reason-modal-overlay">
          <div className="reason-modal">
            <h3>Reason for {reasonInput.status}</h3>
            <p>
              Please enter a reason for {reasonInput.name}'s{" "}
              {reasonInput.status.toLowerCase()}.
            </p>
            <input
              type="text"
              className="reason-input"
              value={reasonInput.reason}
              onChange={(e) =>
                setReasonInput({ ...reasonInput, reason: e.target.value })
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleReasonSubmit();
                }
              }}
              placeholder="e.g., Sick leave, Personal work..."
            />
            <div className="modal-buttons">
              <button className="submit-btn" onClick={handleReasonSubmit}>
                Submit
              </button>
              <button
                className="cancel-btn"
                onClick={() =>
                  setReasonInput({ ...reasonInput, isVisible: false })
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
