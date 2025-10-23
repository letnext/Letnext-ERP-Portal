import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import Swal from "sweetalert2";
import "./attendance.css";

const BASE_URL = import.meta.env.VITE_BASE_URL;

const Attendance = () => {
  const [employees, setEmployees] = useState([]);
  const [newEmployee, setNewEmployee] = useState("");
  const [attendanceData, setAttendanceData] = useState({});
  const [selectedDate, setSelectedDate] = useState("");

  // ✅ Fetch employees & attendance from backend
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const empRes = await fetch(`${BASE_URL}/api/attendance/staffs`);
        const empData = await empRes.json();

        if (!Array.isArray(empData)) {
          Swal.fire("Error", "Invalid employee data received", "error");
          return;
        }

        setEmployees(empData.map((e) => e.name));

        const attRes = await fetch(`${BASE_URL}/api/attendance`);
        const attData = await attRes.json();

        const formatted = {};
        attData.forEach((entry) => {
          if (!formatted[entry.date]) formatted[entry.date] = {};
          formatted[entry.date][entry.employee] = {
            status: entry.status,
            reason: entry.reason,
          };
        });
        setAttendanceData(formatted);
      } catch (err) {
        console.error("Error fetching data:", err);
        Swal.fire("Error", "Failed to fetch data from server", "error");
      }
    };
    fetchAllData();
  }, []);

  // ✅ Add Employee (Backend)
  const handleAddEmployee = async () => {
    if (newEmployee.trim() === "") {
      Swal.fire("Warning", "Please enter an employee name!", "warning");
      return;
    }
    if (employees.includes(newEmployee.trim())) {
      Swal.fire("Info", "Employee already exists!", "info");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/attendance/staffs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newEmployee }),
      });

      if (res.ok) {
        setEmployees([...employees, newEmployee.trim()]);
        setNewEmployee("");
        Swal.fire("Success", "Employee added successfully!", "success");
      } else {
        Swal.fire("Error", "Failed to add employee", "error");
      }
    } catch (err) {
      Swal.fire("Error", "Error adding employee", "error");
    }
  };

  // ✅ Delete Employee (Backend)
  const handleDeleteEmployee = async (name) => {
    const confirm = await Swal.fire({
      title: `Delete ${name}?`,
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!confirm.isConfirmed) return;

    try {
      await fetch(`${BASE_URL}/api/attendance/staffs/${name}`, {
        method: "DELETE",
      });
      const updatedEmployees = employees.filter((emp) => emp !== name);
      const updatedAttendance = { ...attendanceData };
      for (const date in updatedAttendance) {
        delete updatedAttendance[date][name];
      }
      setEmployees(updatedEmployees);
      setAttendanceData(updatedAttendance);
      Swal.fire("Deleted!", `${name} has been removed.`, "success");
    } catch (err) {
      Swal.fire("Error", "Error deleting employee", "error");
    }
  };

  // ✅ Save Attendance to Backend
  const handleStatusChange = async (name, status) => {
    if (!selectedDate) {
      Swal.fire("Warning", "Please select a date first!", "warning");
      return;
    }

    const updatedData = { ...attendanceData };
    if (!updatedData[selectedDate]) updatedData[selectedDate] = {};
    updatedData[selectedDate][name] = {
      status,
      reason:
        status === "Present"
          ? ""
          : updatedData[selectedDate][name]?.reason || "",
    };
    setAttendanceData(updatedData);

    try {
      await fetch(`${BASE_URL}/api/attendance/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          employee: name,
          status,
          reason:
            status === "Present"
              ? ""
              : updatedData[selectedDate][name]?.reason || "",
        }),
      });
      Swal.fire("Saved!", `${name}'s attendance updated.`, "success");
    } catch (err) {
      Swal.fire("Error", "Error saving attendance", "error");
    }
  };

  const handleReasonChange = async (name, reason) => {
    const updatedData = { ...attendanceData };
    if (!updatedData[selectedDate]) updatedData[selectedDate] = {};
    updatedData[selectedDate][name] = {
      ...updatedData[selectedDate][name],
      reason,
    };
    setAttendanceData(updatedData);

    try {
      await fetch(`${BASE_URL}/api/attendance/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          employee: name,
          status: updatedData[selectedDate][name]?.status || "",
          reason,
        }),
      });
      Swal.fire("Updated!", "Reason updated successfully.", "success");
    } catch (err) {
      Swal.fire("Error", "Error updating reason", "error");
    }
  };

  // ✅ Date Restriction
  const today = new Date().toISOString().split("T")[0];
  const handleDateChange = (e) => {
    const dateValue = e.target.value;
    if (dateValue > today) {
      Swal.fire("Warning", "You cannot select a future date!", "warning");
      return;
    }
    setSelectedDate(dateValue);
  };

  // ✅ Excel Export
  const downloadExcel = (type) => {
    if (Object.keys(attendanceData).length === 0) {
      Swal.fire("Info", "No attendance data available!", "info");
      return;
    }

    const rows = [];
    Object.keys(attendanceData).forEach((date) => {
      const year = date.split("-")[0];
      const month = date.split("-")[1];

      if (
        (type === "monthly" &&
          month === selectedDate.split("-")[1] &&
          year === selectedDate.split("-")[0]) ||
        (type === "yearly" && year === selectedDate.split("-")[0])
      ) {
        const dayData = attendanceData[date];
        for (const emp in dayData) {
          rows.push({
            Date: date,
            Employee: emp,
            Status: dayData[emp].status,
            Reason: dayData[emp].reason || "-",
          });
        }
      }
    });

    if (rows.length === 0) {
      Swal.fire("Info", `No ${type} data found for selected date.`, "info");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");

    const fileName =
      type === "monthly"
        ? `Attendance_${selectedDate.slice(0, 7)}.xlsx`
        : `Attendance_${selectedDate.slice(0, 4)}.xlsx`;

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(
      new Blob([excelBuffer], { type: "application/octet-stream" }),
      fileName
    );

    Swal.fire("Success", `${type} Excel downloaded successfully!`, "success");
  };

  const handlePrint = () => {
    if (!selectedDate) {
      Swal.fire("Warning", "Select a date first!", "warning");
      return;
    }

    const currentDayData = attendanceData[selectedDate] || {};
    const printableHTML = `
      <html>
        <head>
          <title>Attendance - ${selectedDate}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2 { text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: center; }
          </style>
        </head>
        <body>
          <h2>Attendance Report for ${selectedDate}</h2>
          <table>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Status</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              ${employees
                .map((name) => {
                  const record = currentDayData[name] || {};
                  return `<tr>
                    <td>${name}</td>
                    <td>${record.status || "-"}</td>
                    <td>${record.reason || "-"}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printableHTML);
    printWindow.document.close();
    printWindow.print();
  };

  const statusOptions = ["Present", "Absent", "Training", "Half Day", "Holiday"];
  const currentDayData = selectedDate ? attendanceData[selectedDate] || {} : {};

  return (
    <div className="attendance-container">
      <h2>Employee Attendance Management</h2>

      <div className="date-picker">
        <label>Select Date: </label>
        <input
          type="date"
          max={today}
          value={selectedDate}
          onChange={handleDateChange}
        />
      </div>

      <div className="action-buttons">
        <button onClick={handlePrint}>🖨️ Print</button>
        <button onClick={() => downloadExcel("monthly")}>
          ⬇️ Monthly Excel
        </button>
        <button onClick={() => downloadExcel("yearly")}>📊 Yearly Excel</button>
      </div>

      <div className="add-employee">
        <input
          type="text"
          value={newEmployee}
          placeholder="Enter employee name"
          onChange={(e) => setNewEmployee(e.target.value)}
        />
        <button onClick={handleAddEmployee}>Add Employee</button>
      </div>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>Employee Name</th>
            <th>Status</th>
            <th>Reason (if applicable)</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 ? (
            <tr>
              <td colSpan="4" style={{ textAlign: "center" }}>
                No employees added yet
              </td>
            </tr>
          ) : (
            employees.map((name, index) => {
              const record = currentDayData[name] || {};
              return (
                <tr key={index}>
                  <td>{name}</td>
                  <td>
                    <select
                      value={record.status || ""}
                      onChange={(e) =>
                        handleStatusChange(name, e.target.value)
                      }
                      disabled={!selectedDate}
                    >
                      <option value="">Select</option>
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {["Absent", "Training", "Half Day", "Holiday"].includes(
                      record.status
                    ) && (
                      <input
                        type="text"
                        placeholder="Enter reason"
                        value={record.reason || ""}
                        onChange={(e) =>
                          handleReasonChange(name, e.target.value)
                        }
                      />
                    )}
                  </td>
                  <td>
                    <button
                      className="delete-btn"
                      onClick={() => handleDeleteEmployee(name)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {selectedDate && employees.length > 0 && (
        <div className="summary">
          <h3>Summary for {selectedDate}</h3>
          <ul>
            {employees.map((name) => {
              const rec = currentDayData[name];
              if (!rec || !rec.status) return null;
              return (
                <li key={name}>
                  {name}: {rec.status}
                  {rec.reason && ` — (${rec.reason})`}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Attendance;
