const express = require("express");
const router = express.Router();
const XLSX = require("xlsx");
const Student = require("../models/student");
const getAttendanceModel = require("../utils/getAttendanceModel");
const Faculty = require("../models/faculty");
const Admin = require("../models/admin")
const ExcelJS = require("exceljs");
const PDFDocument = require('pdfkit');
const fs = require('fs');
const Announcement = require("../models/Announcement");

function getShortBatchName(fullBatchName) {
  const parts = fullBatchName.toUpperCase().split(" ");
  let code =
    parts[0] === "SKILLUP"
      ? "SU"
      : parts[0] === "SKILLNEXT"
      ? "SN"
      : parts[0] === "SKILLBRIDGE"
      ? "SB"
      : "NA";

  const number =
    parts
      .find((p) => p.includes("-"))
      ?.split("-")
      .pop() || "";

  return `V-${code}-${number}`;
}

router.get("/attendance-report", async (req, res) => {
  const { batch, date, format = "excel" } = req.query;

  if (!batch || !date || format !== "excel") {
    return res.status(400).json({
      message: "batch, date, and format=excel are required",
    });
  }

  const batches = Array.isArray(batch) ? batch : [batch];
  const allSummaries = [];

  try {
    for (const b of batches) {
      const collectionName = `attendance_${b
        .toLowerCase()
        .replace(/batch/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")}`;

      const Attendance = getAttendanceModel(collectionName);
      const students = await Attendance.find();

      const branchData = {};

      for (const student of students) {
        const branch = student.branch || "UNKNOWN";
        const shortBatch = getShortBatchName(student.batch);

        if (!branchData[branch]) {
          branchData[branch] = {
            batch: shortBatch,
            branch,
            strength: 0,
            presenties: 0,
            absenties: 0,
          };
        }

        const logsForDate = student.dailyLogs?.filter(
          (log) => log.date === date
        );

        const wasPresent = logsForDate?.some(
          (log) => log.status.toLowerCase() === "present"
        );

        branchData[branch].strength++;
        if (wasPresent) {
          branchData[branch].presenties++;
        } else {
          branchData[branch].absenties++;
        }
      }

      allSummaries.push(...Object.values(branchData));
    }

    // Generate Excel with enhanced styling
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PAT Attendance Summary");

    // Enhanced sheet settings
    sheet.views = [{ state: 'normal' }];

    // Format date to DD-MM-YYYY
    const formatDateForDisplay = (dateString) => {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;

      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const displayDate = formatDateForDisplay(date);

    // Enhanced header styling with gradient colors and better fonts
    const headerRows = [
      ["Institute of Aeronautical Engineering", "1f4e79", 16, "FFFFFF"], // Dark blue background, white text
      [`PAT Attendance Summary - ${displayDate}`, "2e75b6", 14, "FFFFFF"], // Medium blue
      ["Career Development Center", "3d85c6", 12, "FFFFFF"], // Light blue
      ["B.Tech V Semester Attendance Summary", "4a90e2", 11, "FFFFFF"], // Lighter blue
    ];

    headerRows.forEach(([text, bgColor, fontSize, textColor], i) => {
      const row = sheet.addRow([text, "", "", "", ""]);
      sheet.mergeCells(`A${i + 1}:E${i + 1}`);
      
      row.getCell(1).font = { 
        bold: true, 
        size: fontSize,
        color: { argb: textColor },
        name: "Calibri"
      };
      row.getCell(1).alignment = { 
        horizontal: "center", 
        vertical: "middle" 
      };
      row.height = fontSize + 8; // Dynamic row height
      
      row.eachCell(cell => {
        cell.fill = { 
          type: "pattern", 
          pattern: "solid", 
          fgColor: { argb: bgColor } 
        };
        cell.border = {
          top: { style: "medium", color: { argb: "000000" } },
          left: { style: "medium", color: { argb: "000000" } },
          bottom: { style: "medium", color: { argb: "000000" } },
          right: { style: "medium", color: { argb: "000000" } },
        };
      });
    });

    // Add spacing row
    const spacingRow = sheet.addRow(["", "", "", "", ""]);
    spacingRow.height = 5;
    spacingRow.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8F9FA" } };
    });

    // Enhanced column headers with better styling
    const headerRow = sheet.addRow([
      "BATCH",
      "BRANCH",
      "Total Strength",
      "Present",
      "Absent",
    ]);
    headerRow.height = 25;
    
    headerRow.eachCell((cell, colNumber) => {
      cell.fill = { 
        type: "pattern", 
        pattern: "solid", 
        fgColor: { argb: "34495e" } // Dark gray
      };
      cell.font = { 
        bold: true, 
        size: 12,
        color: { argb: "FFFFFF" },
        name: "Calibri"
      };
      cell.alignment = { 
        horizontal: "center", 
        vertical: "middle" 
      };
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    // Enhanced column widths
    sheet.columns = [
      { width: 25 }, // BATCH
      { width: 25 }, // BRANCH
      { width: 20 }, // Total Strength
      { width: 20 }, // Presenties
      { width: 20 }, // Absenties
    ];

    // Data Rows with enhanced styling
    let totalPresent = 0;
    let totalAbsent = 0;

    allSummaries.forEach((item, index) => {
      const row = sheet.addRow([
        item.batch,
        item.branch,
        item.strength,
        item.presenties,
        item.absenties,
      ]);

      totalPresent += item.presenties;
      totalAbsent += item.absenties;

      row.height = 22;

      row.eachCell((cell, colNumber) => {
        // Enhanced font styling
        cell.font = { 
          name: "Calibri", 
          size: 11
        };
        
        // Better alignment
        cell.alignment = { 
          vertical: "middle", 
          horizontal: colNumber === 2 ? "left" : "center" // Branch name left-aligned
        };
        
        // Enhanced borders
        cell.border = {
          top: { style: "thin", color: { argb: "CCCCCC" } },
          left: { style: "thin", color: { argb: "CCCCCC" } },
          bottom: { style: "thin", color: { argb: "CCCCCC" } },
          right: { style: "thin", color: { argb: "CCCCCC" } },
        };

        // Conditional formatting for present and absent
        if (colNumber === 4) { // Present column
          cell.fill = { 
            type: "pattern", 
            pattern: "solid", 
            fgColor: { argb: "D4F3D0" } // Light green for present
          };
          cell.font = { 
            ...cell.font, 
            color: { argb: "2E7D32" }, // Dark green text
            bold: true
          };
        } else if (colNumber === 5) { // Absent column
          cell.fill = { 
            type: "pattern", 
            pattern: "solid", 
            fgColor: { argb: "FFEBEE" } // Light red for absent
          };
          cell.font = { 
            ...cell.font, 
            color: { argb: "C62828" }, // Dark red text
            bold: true
          };
        } else {
          // Alternating row colors for better readability
          const bgColor = (index % 2 === 0) ? "F8F9FA" : "FFFFFF";
          cell.fill = { 
            type: "pattern", 
            pattern: "solid", 
            fgColor: { argb: bgColor } 
          };
        }
      });
    });

    // Enhanced Totals Row
    const spacingRow2 = sheet.addRow(["", "", "", "", ""]);
    spacingRow2.height = 10;
    spacingRow2.eachCell(cell => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8F9FA" } };
    });

    // Summary header
    const summaryHeaderRow = sheet.addRow(["", "SUMMARY", "", "", ""]);
    sheet.mergeCells(`B${summaryHeaderRow.number}:E${summaryHeaderRow.number}`);
    summaryHeaderRow.height = 25;
    
    summaryHeaderRow.getCell(2).font = { 
      bold: true, 
      size: 12,
      color: { argb: "FFFFFF" },
      name: "Calibri"
    };
    summaryHeaderRow.getCell(2).alignment = { 
      horizontal: "center", 
      vertical: "middle" 
    };
    summaryHeaderRow.getCell(2).fill = { 
      type: "pattern", 
      pattern: "solid", 
      fgColor: { argb: "3498DB" } // Blue background for header
    };
    summaryHeaderRow.getCell(2).border = {
      top: { style: "medium", color: { argb: "000000" } },
      left: { style: "medium", color: { argb: "000000" } },
      bottom: { style: "medium", color: { argb: "000000" } },
      right: { style: "medium", color: { argb: "000000" } },
    };

    // Enhanced totals row
    const totalRow = sheet.addRow([
      "TOTAL", 
      `Total Students: ${totalPresent + totalAbsent}`, 
      totalPresent + totalAbsent, 
      totalPresent, 
      totalAbsent
    ]);
    totalRow.height = 25;
    
    totalRow.eachCell((cell, colNumber) => {
      cell.font = { 
        bold: true, 
        size: 11,
        color: { argb: "FFFFFF" },
        name: "Calibri"
      };
      cell.alignment = { 
        horizontal: "center", 
        vertical: "middle" 
      };
      
      // Color coding for totals
      if (colNumber === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "34495e" } }; // Dark gray
      } else if (colNumber === 2) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3498DB" } }; // Blue
      } else if (colNumber === 3) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "9B59B6" } }; // Purple
      } else if (colNumber === 4) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "27AE60" } }; // Green
      } else if (colNumber === 5) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E74C3C" } }; // Red
      }
      
      cell.border = {
        top: { style: "medium", color: { argb: "000000" } },
        left: { style: "medium", color: { argb: "000000" } },
        bottom: { style: "medium", color: { argb: "000000" } },
        right: { style: "medium", color: { argb: "000000" } },
      };
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_summary_${displayDate.replace(
        /-/g,
        "_"
      )}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/attendance-report-pdf", async (req, res) => {
  const { batch, date } = req.query;

  if (!batch || !date) {
    return res.status(400).json({
      message: "batch and date are required",
    });
  }

  const batches = Array.isArray(batch) ? batch : [batch];
  const allSummaries = [];

  try {
    for (const b of batches) {
      const collectionName = `attendance_${b
        .toLowerCase()
        .replace(/batch/gi, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/--+/g, "-")}`;

      const Attendance = getAttendanceModel(collectionName);
      const students = await Attendance.find();

      const branchData = {};

      for (const student of students) {
        const branch = student.branch || "UNKNOWN";
        const shortBatch = getShortBatchName(student.batch);

        if (!branchData[branch]) {
          branchData[branch] = {
            batch: shortBatch,
            branch,
            strength: 0,
            presenties: 0,
            absenties: 0,
          };
        }

        const logsForDate = student.dailyLogs?.filter(
          (log) => log.date === date
        );

        const wasPresent = logsForDate?.some(
          (log) => log.status.toLowerCase() === "present"
        );

        branchData[branch].strength++;
        if (wasPresent) {
          branchData[branch].presenties++;
        } else {
          branchData[branch].absenties++;
        }
      }

      allSummaries.push(...Object.values(branchData));
    }

    // Format date
    const formatDateForDisplay = (dateString) => {
      const dateObj = new Date(dateString);
      if (isNaN(dateObj.getTime())) return dateString;

      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const year = dateObj.getFullYear();
      return `${day}-${month}-${year}`;
    };

    const displayDate = formatDateForDisplay(date);

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      layout: "portrait",
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=attendance_summary_${displayDate.replace(/-/g, "_")}.pdf`
    );

    doc.pipe(res);

    const colors = {
      darkBlue: "#1f4e79",
      mediumBlue: "#2e75b6",
      lightBlue: "#3d85c6",
      lighterBlue: "#4a90e2",
      darkGray: "#34495e",
      lightGray: "#f8f9fa",
      green: "#27ae60",
      red: "#e74c3c",
      lightGreen: "#d4f3d0",
      lightRed: "#ffebee",
      white: "#ffffff",
      black: "#000000",
    };

    const addColoredRect = (x, y, width, height, color) => {
      doc.rect(x, y, width, height).fill(color);
    };

    const addTextWithBackground = (
      text,
      x,
      y,
      width,
      height,
      bgColor,
      textColor,
      fontSize = 12,
      align = "center"
    ) => {
      addColoredRect(x, y, width, height, bgColor);
      doc.rect(x, y, width, height).stroke("#000000");
      doc
        .fillColor(textColor)
        .fontSize(fontSize)
        .font("Helvetica-Bold");
      if (align === "center") {
        doc.text(text, x, y + (height - fontSize) / 2, {
          width: width,
          align: "center",
        });
      } else {
        doc.text(text, x + 5, y + (height - fontSize) / 2, {
          width: width - 10,
          align: align,
        });
      }
    };

    const pageWidth = doc.page.width - 100;
    const rowHeight = 25;
    let currentY = 50;

    const drawHeaders = () => {
      const headerSections = [
        {
          text: "Institute of Aeronautical Engineering",
          color: colors.darkBlue,
          fontSize: 16,
        },
        {
          text: `PAT Attendance Summary - ${displayDate}`,
          color: colors.mediumBlue,
          fontSize: 14,
        },
        {
          text: "Career Development Center",
          color: colors.lightBlue,
          fontSize: 12,
        },
        {
          text: "B.Tech V Semester Attendance Summary",
          color: colors.lighterBlue,
          fontSize: 11,
        },
      ];

      headerSections.forEach((section) => {
        const headerHeight = section.fontSize + 8;
        addTextWithBackground(
          section.text,
          50,
          currentY,
          pageWidth,
          headerHeight,
          section.color,
          colors.white,
          section.fontSize,
          "center"
        );
        currentY += headerHeight;
      });

      currentY += 20;
    };

    const drawTableHeader = () => {
      const headers = [
        "BATCH",
        "BRANCH",
        "Total Strength",
        "Present",
        "Absent",
      ];
      const colWidths = [
        pageWidth * 0.2,
        pageWidth * 0.25,
        pageWidth * 0.2,
        pageWidth * 0.175,
        pageWidth * 0.175,
      ];

      let tableX = 50;
      headers.forEach((header, index) => {
        addTextWithBackground(
          header,
          tableX,
          currentY,
          colWidths[index],
          rowHeight,
          colors.darkGray,
          colors.white,
          12,
          "center"
        );
        tableX += colWidths[index];
      });
      currentY += rowHeight;

      return colWidths;
    };

    drawHeaders();
    const colWidths = drawTableHeader();

    let totalPresent = 0;
    let totalAbsent = 0;

    allSummaries.forEach((item, index) => {
      totalPresent += item.presenties;
      totalAbsent += item.absenties;

      if (currentY + rowHeight > doc.page.height - 100) {
        doc.addPage();
        currentY = 50;
        drawHeaders();
        drawTableHeader();
      }

      let tableX = 50;
      const isEvenRow = index % 2 === 0;
      const rowBgColor = isEvenRow ? colors.lightGray : colors.white;

      const rowData = [
        item.batch,
        item.branch,
        item.strength.toString(),
        item.presenties.toString(),
        item.absenties.toString(),
      ];

      rowData.forEach((data, colIndex) => {
        let bgColor = rowBgColor;
        let textColor = colors.black;

        if (colIndex === 3) {
          bgColor = colors.lightGreen;
          textColor = "#2e7d32";
        } else if (colIndex === 4) {
          bgColor = colors.lightRed;
          textColor = "#c62828";
        }

        addColoredRect(tableX, currentY, colWidths[colIndex], rowHeight, bgColor);
        doc.rect(tableX, currentY, colWidths[colIndex], rowHeight).stroke("#cccccc");
        doc
          .fillColor(textColor)
          .fontSize(11)
          .font(colIndex >= 3 ? "Helvetica-Bold" : "Helvetica");

        const textAlign = colIndex === 1 ? "left" : "center";
        doc.text(
          data,
          textAlign === "center" ? tableX : tableX + 5,
          currentY + (rowHeight - 11) / 2,
          {
            width: colWidths[colIndex] - (textAlign === "center" ? 0 : 10),
            align: textAlign,
          }
        );

        tableX += colWidths[colIndex];
      });

      currentY += rowHeight;
    });

    // Summary section
    if (currentY + rowHeight * 2 > doc.page.height - 100) {
      doc.addPage();
      currentY = 50;
      drawHeaders();
    }

    currentY += 20;

    addTextWithBackground(
      "SUMMARY",
      50,
      currentY,
      pageWidth,
      rowHeight,
      colors.mediumBlue,
      colors.white,
      12,
      "center"
    );
    currentY += rowHeight;

    const summaryData = [
      {
        text: "TOTAL",
        color: colors.darkGray,
        width: pageWidth * 0.2,
      },
      {
        text: `Total Students: ${totalPresent + totalAbsent}`,
        color: colors.mediumBlue,
        width: pageWidth * 0.35,
      },
      {
        text: (totalPresent + totalAbsent).toString(),
        color: "#9b59b6",
        width: pageWidth * 0.15,
      },
      {
        text: totalPresent.toString(),
        color: colors.green,
        width: pageWidth * 0.15,
      },
      {
        text: totalAbsent.toString(),
        color: colors.red,
        width: pageWidth * 0.15,
      },
    ];

    let summaryX = 50;
    summaryData.forEach((item) => {
      addTextWithBackground(
        item.text,
        summaryX,
        currentY,
        item.width,
        rowHeight,
        item.color,
        colors.white,
        11,
        "center"
      );
      summaryX += item.width;
    });

    doc.end();
  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/attendance/complete-report/:collectionName", async (req, res) => {
  try {
    const collectionName = req.params.collectionName;
    if (!collectionName) {
      return res.status(400).json({ message: "Missing collectionName parameter" });
    }

    const reportDate = new Date().toISOString().slice(0, 10);
    const displayDate = new Date().toLocaleDateString("en-GB").split("/").join("-");

    const Attendance = getAttendanceModel(collectionName);
    const attendanceRecords = await Attendance.find({});

    const sampleAttendance = attendanceRecords[0];
    const sampleStudent = sampleAttendance
      ? await Student.findOne({ rollno: sampleAttendance.rollno })
      : null;

    const batchName = sampleStudent?.batch || "UNKNOWN BATCH";
    const shortBatchName = getShortBatchName(batchName);
    const students = await Student.find({ batch: batchName });

    const workbook = new ExcelJS.Workbook();

    const styleHeaders = (sheet, title) => {
      sheet.views = [{ state: 'normal' }];

      // Enhanced header styling with gradient colors and better fonts
      const headerRows = [
        ["Institute of Aeronautical Engineering", "1f4e79", 16, "FFFFFF"], // Dark blue background, white text
        [`PAT Attendance Summary - ${displayDate}`, "2e75b6", 14, "FFFFFF"], // Medium blue
        ["Career Development Center", "3d85c6", 12, "FFFFFF"], // Light blue
        [title, "4a90e2", 11, "FFFFFF"], // Lighter blue
      ];

      headerRows.forEach(([text, bgColor, fontSize, textColor], i) => {
        const row = sheet.addRow([text, "", "", "", "", ""]);
        sheet.mergeCells(`A${i + 1}:F${i + 1}`);
        
        row.getCell(1).font = { 
          bold: true, 
          size: fontSize,
          color: { argb: textColor },
          name: "Calibri"
        };
        row.getCell(1).alignment = { 
          horizontal: "center", 
          vertical: "middle" 
        };
        row.height = fontSize + 8; // Dynamic row height
        
        row.eachCell(cell => {
          cell.fill = { 
            type: "pattern", 
            pattern: "solid", 
            fgColor: { argb: bgColor } 
          };
          cell.border = {
            top: { style: "medium", color: { argb: "000000" } },
            left: { style: "medium", color: { argb: "000000" } },
            bottom: { style: "medium", color: { argb: "000000" } },
            right: { style: "medium", color: { argb: "000000" } },
          };
        });
      });

      // Add spacing row
      const spacingRow = sheet.addRow(["", "", "", "", "", ""]);
      spacingRow.height = 5;
      spacingRow.eachCell(cell => {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "F8F9FA" } };
      });

      // Enhanced column headers with better styling
      const headerRow = sheet.addRow(["S.No", "Roll No", "Name", "Branch", "Batch", "Status"]);
      headerRow.height = 25;
      
      headerRow.eachCell((cell, colNumber) => {
        cell.fill = { 
          type: "pattern", 
          pattern: "solid", 
          fgColor: { argb: "34495e" } // Dark gray
        };
        cell.font = { 
          bold: true, 
          size: 12,
          color: { argb: "FFFFFF" },
          name: "Calibri"
        };
        cell.alignment = { 
          horizontal: "center", 
          vertical: "middle" 
        };
        cell.border = {
          top: { style: "medium", color: { argb: "000000" } },
          left: { style: "medium", color: { argb: "000000" } },
          bottom: { style: "medium", color: { argb: "000000" } },
          right: { style: "medium", color: { argb: "000000" } },
        };
      });

      // Enhanced column widths
      sheet.columns = [
        { key: "sno", width: 10 },
        { key: "roll", width: 18 },
        { key: "name", width: 35 },
        { key: "branch", width: 20 },
        { key: "batch", width: 25 },
        { key: "status", width: 16 },
      ];
    };

    const addStudentRows = (sheet, data, showAbsentCountOnly = false) => {
      let sr = 1;
      let absent = 0;
      let present = 0;

      data.forEach(({ student, isPresent }) => {
        if (!isPresent) {
          absent++;
        } else {
          present++;
        }

        const row = sheet.addRow([
          sr++,
          student.rollno,
          student.name,
          student.branch || "UNKNOWN",
          getShortBatchName(student.batch),
          isPresent ? "Present" : "Absent",
        ]);

        row.height = 22;

        row.eachCell((cell, colNumber) => {
          // Enhanced font styling
          cell.font = { 
            name: "Calibri", 
            size: 11,
            bold: colNumber === 6 // Make status column bold
          };
          
          // Better alignment
          cell.alignment = { 
            vertical: "middle", 
            horizontal: colNumber === 3 ? "left" : "center" 
          };
          
          // Enhanced borders
          cell.border = {
            top: { style: "thin", color: { argb: "CCCCCC" } },
            left: { style: "thin", color: { argb: "CCCCCC" } },
            bottom: { style: "thin", color: { argb: "CCCCCC" } },
            right: { style: "thin", color: { argb: "CCCCCC" } },
          };

          // Conditional formatting for status
          if (colNumber === 6) { // Status column
            if (isPresent) {
              cell.fill = { 
                type: "pattern", 
                pattern: "solid", 
                fgColor: { argb: "D4F3D0" } // Light green for present
              };
              cell.font = { 
                ...cell.font, 
                color: { argb: "2E7D32" } // Dark green text
              };
            } else {
              cell.fill = { 
                type: "pattern", 
                pattern: "solid", 
                fgColor: { argb: "FFEBEE" } // Light red for absent
              };
              cell.font = { 
                ...cell.font, 
                color: { argb: "C62828" } // Dark red text
              };
            }
          } else {
            // Alternating row colors for better readability
            const bgColor = (sr % 2 === 0) ? "F8F9FA" : "FFFFFF";
            cell.fill = { 
              type: "pattern", 
              pattern: "solid", 
              fgColor: { argb: bgColor } 
            };
          }
        });
      });

      // Enhanced summary section
      if (showAbsentCountOnly) {
        // Add spacing
        const spacingRow = sheet.addRow(["", "", "", "", "", ""]);
        spacingRow.height = 10;
        
        // Summary header
        const summaryHeaderRow = sheet.addRow(["", "", "SUMMARY", "", "", ""]);
        sheet.mergeCells(`C${summaryHeaderRow.number}:F${summaryHeaderRow.number}`);
        summaryHeaderRow.height = 25;
        
        summaryHeaderRow.getCell(3).font = { 
          bold: true, 
          size: 12,
          color: { argb: "FFFFFF" },
          name: "Calibri"
        };
        summaryHeaderRow.getCell(3).alignment = { 
          horizontal: "center", 
          vertical: "middle" 
        };
        summaryHeaderRow.getCell(3).fill = { 
          type: "pattern", 
          pattern: "solid", 
          fgColor: { argb: "3498DB" } // Blue background for header
        };
        summaryHeaderRow.getCell(3).border = {
          top: { style: "medium", color: { argb: "000000" } },
          left: { style: "medium", color: { argb: "000000" } },
          bottom: { style: "medium", color: { argb: "000000" } },
          right: { style: "medium", color: { argb: "000000" } },
        };
        
        // Summary data - Only show Absent count for branch-specific sheets
        const summaryRow = sheet.addRow(["", "", "", "", "", `Absent: ${absent}`]);
        summaryRow.height = 22;
        
        summaryRow.eachCell((cell, colNumber) => {
          if (colNumber === 6) {
            cell.font = { 
              bold: true, 
              size: 11,
              color: { argb: "FFFFFF" },
              name: "Calibri"
            };
            cell.alignment = { 
              horizontal: "center", 
              vertical: "middle" 
            };
            
            cell.fill = { 
              type: "pattern", 
              pattern: "solid", 
              fgColor: { argb: "E74C3C" } // Red background for Absent
            };
            
            cell.border = {
              top: { style: "thin", color: { argb: "000000" } },
              left: { style: "thin", color: { argb: "000000" } },
              bottom: { style: "thin", color: { argb: "000000" } },
              right: { style: "thin", color: { argb: "000000" } },
            };
          }
        });
      } else {
        // Add summary for complete report
        const spacingRow = sheet.addRow(["", "", "", "", "", ""]);
        spacingRow.height = 10;
        
        const summaryRow = sheet.addRow(["", "", "TOTAL SUMMARY", "", `Present: ${present}`, `Absent: ${absent}`]);
        sheet.mergeCells(`C${summaryRow.number}:D${summaryRow.number}`);
        summaryRow.height = 25;
        
        summaryRow.eachCell((cell, colNumber) => {
          if (colNumber >= 3) {
            cell.font = { 
              bold: true, 
              size: 11,
              color: { argb: "FFFFFF" },
              name: "Calibri"
            };
            cell.alignment = { 
              horizontal: "center", 
              vertical: "middle" 
            };
            
            if (colNumber === 3) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "3498DB" } }; // Blue
            } else if (colNumber === 5) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "27AE60" } }; // Green
            } else if (colNumber === 6) {
              cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "E74C3C" } }; // Red
            }
            
            cell.border = {
              top: { style: "medium", color: { argb: "000000" } },
              left: { style: "medium", color: { argb: "000000" } },
              bottom: { style: "medium", color: { argb: "000000" } },
              right: { style: "medium", color: { argb: "000000" } },
            };
          }
        });
      }
    };

    // Compute presence
    const completeData = students.map(student => {
      const attendance = attendanceRecords.find(a => a.rollno === student.rollno);
      const logs = attendance?.dailyLogs?.filter(log => log.date === reportDate) || [];
      const isPresent = logs.some(log => log.status === "present");
      return { student, isPresent };
    });

    // Sort by Branch > Roll No
    const sortedData = [...completeData].sort((a, b) => {
      const branchA = (a.student.branch || "UNKNOWN").trim().toUpperCase();
      const branchB = (b.student.branch || "UNKNOWN").trim().toUpperCase();

      if (branchA === branchB) {
        return a.student.rollno.localeCompare(b.student.rollno);
      }
      return branchA.localeCompare(branchB);
    });

    // Sheet 1: Complete Report
    const completeSheet = workbook.addWorksheet("Complete Report");
    styleHeaders(completeSheet, `B.Tech V Semester - ${shortBatchName}(Both Present & Absent)`);
    addStudentRows(completeSheet, sortedData);

    // Branch-wise Absentee Sheets
    const branchMap = {};
    for (const entry of completeData) {
      const branch = (entry.student.branch || "UNKNOWN").trim().toUpperCase();
      if (!branchMap[branch]) branchMap[branch] = [];
      branchMap[branch].push(entry);
    }

    for (const branch of Object.keys(branchMap).sort()) {
      const absentees = branchMap[branch].filter(entry => !entry.isPresent);
      if (absentees.length === 0) continue;

      // ✅ Sort absentees by roll number for each branch
      const sortedAbsentees = absentees.sort((a, b) => {
        return a.student.rollno.localeCompare(b.student.rollno);
      });

      const sheetName = `${shortBatchName}_${branch}`.replace(/[\\\/\?\*\[\]]/g, "").slice(0, 31);
      const sheet = workbook.addWorksheet(sheetName);
      styleHeaders(sheet, `B.Tech V Semester - ${shortBatchName}_${branch}(Absent Only)`);
      addStudentRows(sheet, sortedAbsentees, true);
    }

    const fileName = `${shortBatchName}_${displayDate}.xlsx`;
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating attendance report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/attendance/complete-report-pdf/:collectionName", async (req, res) => {
  try {
    const collectionName = req.params.collectionName;
    if (!collectionName) {
      return res.status(400).json({ message: "Missing collectionName parameter" });
    }

    const reportDate = new Date().toISOString().slice(0, 10);
    const displayDate = new Date().toLocaleDateString("en-GB").split("/").join("-");

    const Attendance = getAttendanceModel(collectionName);
    const attendanceRecords = await Attendance.find({});

    const sampleAttendance = attendanceRecords[0];
    const sampleStudent = sampleAttendance
      ? await Student.findOne({ rollno: sampleAttendance.rollno })
      : null;

    const batchName = sampleStudent?.batch || "UNKNOWN BATCH";
    const shortBatchName = getShortBatchName(batchName);
    const students = await Student.find({ batch: batchName });

    // Compute presence
    const completeData = students.map(student => {
      const attendance = attendanceRecords.find(a => a.rollno === student.rollno);
      const logs = attendance?.dailyLogs?.filter(log => log.date === reportDate) || [];
      const isPresent = logs.some(log => log.status === "present");
      return { student, isPresent };
    });

    // Sort by Branch > Roll No
    const sortedData = [...completeData].sort((a, b) => {
      const branchA = (a.student.branch || "UNKNOWN").trim().toUpperCase();
      const branchB = (b.student.branch || "UNKNOWN").trim().toUpperCase();

      if (branchA === branchB) {
        return a.student.rollno.localeCompare(b.student.rollno);
      }
      return branchA.localeCompare(branchB);
    });

    // Create PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    const fileName = `${shortBatchName}_${displayDate}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"; filename*=UTF-8''${encodedFileName}`
    );
  
    // Pipe PDF to response
    doc.pipe(res);

    // Helper function to add headers
    const addHeaders = (doc, title) => {
      let yPos = 50; // Always start from top margin
      
      // Header 1: Institute name
      doc.rect(50, yPos, 495, 35)
         .fillAndStroke('#1f4e79', '#000000')
         .fillColor('#ffffff')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('Institute of Aeronautical Engineering', 50, yPos + 12, { 
           width: 495, 
           align: 'center' 
         });
      
      yPos += 35;
      
      // Header 2: PAT Attendance Summary
      doc.rect(50, yPos, 495, 30)
         .fillAndStroke('#2e75b6', '#000000')
         .fillColor('#ffffff')
         .fontSize(14)
         .text(`PAT Attendance Summary - ${displayDate}`, 50, yPos + 10, { 
           width: 495, 
           align: 'center' 
         });
      
      yPos += 30;
      
      // Header 3: Career Development Center
      doc.rect(50, yPos, 495, 25)
         .fillAndStroke('#3d85c6', '#000000')
         .fillColor('#ffffff')
         .fontSize(12)
         .text('Career Development Center', 50, yPos + 8, { 
           width: 495, 
           align: 'center' 
         });
      
      yPos += 25;
      
      // Header 4: Title
      doc.rect(50, yPos, 495, 25)
         .fillAndStroke('#4a90e2', '#000000')
         .fillColor('#ffffff')
         .fontSize(11)
         .text(title, 50, yPos + 8, { 
           width: 495, 
           align: 'center' 
         });
      
      return yPos + 35; // Return next Y position
    };

    // Helper function to create table with proper page management
    const createTable = (doc, data, startY, showSummary = false, summaryType = 'complete') => {
      let yPos = startY;
      const headerHeight = 25;
      const rowHeight = 20;
      const colWidths = [40, 70, 180, 80, 80, 45]; // S.No, Roll No, Name, Branch, Batch, Status
      const pageBottom = 750; // Bottom margin for page break
      
      // Function to add table header
      const addTableHeader = (yPosition) => {
        let xPos = 50;
        
        // Draw header background
        doc.rect(50, yPosition, 495, headerHeight)
           .fillAndStroke('#34495e', '#000000')
           .fillColor('#ffffff')
           .fontSize(10)
           .font('Helvetica-Bold');
        
        // Header text
        const headers = ['S.No', 'Roll No', 'Name', 'Branch', 'Batch', 'Status'];
        headers.forEach((header, i) => {
          doc.text(header, xPos + 5, yPosition + 8, { 
            width: colWidths[i] - 10, 
            align: 'center' 
          });
          xPos += colWidths[i];
        });
        
        return yPosition + headerHeight;
      };
      
      // Add initial table header
      yPos = addTableHeader(yPos);
      
      // Table rows
      data.forEach((item, index) => {
        // Check if we need a new page
        if (yPos + rowHeight > pageBottom) {
          doc.addPage();
          yPos = addTableHeader(50); // Add header at top of new page
        }
        
        let xPos = 50;
        
        // Alternating row colors
        const fillColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(50, yPos, 495, rowHeight).fillAndStroke(fillColor, '#cccccc');
        
        // Row data
        const rowData = [
          (index + 1).toString(),
          item.student.rollno,
          item.student.name,
          item.student.branch || "UNKNOWN",
          getShortBatchName(item.student.batch),
          item.isPresent ? "Present" : "Absent"
        ];
        
        rowData.forEach((cell, i) => {
          // Special styling for status column
          if (i === 5) {
            const statusColor = item.isPresent ? '#d4f3d0' : '#ffebee';
            const textColor = item.isPresent ? '#2e7d32' : '#c62828';
            
            doc.rect(xPos, yPos, colWidths[i], rowHeight)
               .fillAndStroke(statusColor, '#cccccc')
               .fillColor(textColor)
               .fontSize(9)
               .font('Helvetica-Bold');
          } else {
            doc.fillColor('#000000')
               .fontSize(9)
               .font('Helvetica');
          }
          
          const align = i === 2 ? 'left' : 'center'; // Left align names
          doc.text(cell, xPos + 5, yPos + 6, { 
            width: colWidths[i] - 10, 
            align: align 
          });
          
          xPos += colWidths[i];
        });
        
        yPos += rowHeight;
      });
      
      // Add summary
      if (showSummary) {
        // Check if we need space for summary
        if (yPos + 65 > pageBottom) {
          doc.addPage();
          yPos = 50;
        }
        
        yPos += 20;
        const present = data.filter(item => item.isPresent).length;
        const absent = data.filter(item => !item.isPresent).length;
        
        if (summaryType === 'branch') {
          // Branch-wise summary header
          doc.rect(50, yPos, 495, 25)
             .fillAndStroke('#3498db', '#000000')
             .fillColor('#ffffff')
             .fontSize(12)
             .font('Helvetica-Bold')
             .text('SUMMARY', 50, yPos + 8, { 
               width: 495, 
               align: 'center' 
             });
          
          yPos += 25;
          
          // Summary data - Only show absent count for branch-specific sheets
          doc.rect(50, yPos, 495, 20)
             .fillAndStroke('#e74c3c', '#000000')
             .fillColor('#ffffff')
             .fontSize(10)
             .text(`Absent: ${absent}`, 50, yPos + 6, { 
               width: 495, 
               align: 'center' 
             });
             
        } else {
          // Complete report summary
          doc.rect(50, yPos, 495, 25)
             .fillAndStroke('#3498db', '#000000')
             .fillColor('#ffffff')
             .fontSize(12)
             .font('Helvetica-Bold')
             .text('TOTAL SUMMARY', 50, yPos + 8, { 
               width: 495, 
               align: 'center' 
             });
          
          yPos += 25;
          
          // Three columns for complete summary
          doc.rect(50, yPos, 165, 20)
             .fillAndStroke('#3498db', '#000000')
             .fillColor('#ffffff')
             .fontSize(10)
             .text(`TOTAL: ${data.length}`, 50, yPos + 6, { 
               width: 165, 
               align: 'center' 
             });
          
          doc.rect(215, yPos, 165, 20)
             .fillAndStroke('#27ae60', '#000000')
             .fillColor('#ffffff')
             .text(`Present: ${present}`, 215, yPos + 6, { 
               width: 165, 
               align: 'center' 
             });
          
          doc.rect(380, yPos, 165, 20)
             .fillAndStroke('#e74c3c', '#000000')
             .fillColor('#ffffff')
             .text(`Absent: ${absent}`, 380, yPos + 6, { 
               width: 165, 
               align: 'center' 
             });
        }
      }
      
      return yPos;
    };

    // Generate Complete Report
    let currentY = addHeaders(doc, `B.Tech V Semester - ${shortBatchName}(Both Present & Absent)`);
    createTable(doc, sortedData, currentY, true, 'complete');

    // Generate Branch-wise Absentee Reports
    const branchMap = {};
    for (const entry of completeData) {
      const branch = (entry.student.branch || "UNKNOWN").trim().toUpperCase();
      if (!branchMap[branch]) branchMap[branch] = [];
      branchMap[branch].push(entry);
    }

    // Get branches with absentees only
    const branchesWithAbsentees = Object.keys(branchMap)
      .filter(branch => branchMap[branch].some(entry => !entry.isPresent))
      .sort();

    console.log(`Generating reports for ${branchesWithAbsentees.length} branches with absentees`);

    for (const branch of branchesWithAbsentees) {
      const absentees = branchMap[branch].filter(entry => !entry.isPresent);
      
      if (absentees.length === 0) continue;

      console.log(`Processing branch ${branch} with ${absentees.length} absentees`);

      // Sort absentees by roll number
      const sortedAbsentees = absentees.sort((a, b) => {
        return a.student.rollno.localeCompare(b.student.rollno);
      });

      // Add new page for each branch
      doc.addPage();
      const title = `B.Tech V Semester - ${shortBatchName}_${branch}(Absent Only)`;
      currentY = addHeaders(doc, title);
      createTable(doc, sortedAbsentees, currentY, true, 'branch');
    }

    // Finalize PDF
    doc.end();

  } catch (err) {
    console.error("Error generating PDF report:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});
// PATCH /mark-present (Bulk Operation Version)
router.patch("/mark-present-bulk", async (req, res) => {
  try {
    const { course, presenties, batch } = req.body;
    
    if (!course || !Array.isArray(presenties) || !batch) {
      return res.status(400).json({ message: "Missing course, presenties, or batch" });
    }

    const Attendance = getAttendanceModel(batch);
    const today = new Date().toISOString().slice(0, 10);
    const courseKey = course.trim();

    // Build bulk operations
    const bulkOps = [];
    
    // First, find all students with absent logs for today
    const studentsWithAbsentLogs = await Attendance.find({
      rollno: { $in: presenties },
      dailyLogs: {
        $elemMatch: {
          date: today,
          course: courseKey,
          status: "absent"
        }
      }
    });

    console.log(`📝 Found ${studentsWithAbsentLogs.length} students with absent logs`);

    for (const student of studentsWithAbsentLogs) {
      // Find the specific log index
      const logIndex = student.dailyLogs.findIndex(
        (log) =>
          log.date === today &&
          log.course === courseKey &&
          log.status === "absent"
      );

      if (logIndex !== -1) {
        bulkOps.push({
          updateOne: {
            filter: {
              rollno: student.rollno,
              [`dailyLogs.${logIndex}.date`]: today,
              [`dailyLogs.${logIndex}.course`]: courseKey,
              [`dailyLogs.${logIndex}.status`]: "absent"
            },
            update: {
              $set: {
                [`dailyLogs.${logIndex}.status`]: "present",
                lastUpdated: new Date()
              },
              $inc: {
                "overallAttendance.presentDays": 1,
                [`courseAttendance.${courseKey}.presentDays`]: 1
              }
            }
          }
        });
      }
    }

    if (bulkOps.length === 0) {
      return res.status(404).json({
        message: "No absent logs found for the specified students and course today",
        updatedCount: 0
      });
    }

    // Execute bulk operations
    const result = await Attendance.bulkWrite(bulkOps, { ordered: false });

    console.log(`📊 Bulk operation result:`, result);

    res.status(200).json({
      message: "Bulk mark present operation completed",
      updatedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
      totalRequested: presenties.length,
      foundAbsentLogs: studentsWithAbsentLogs.length
    });

  } catch (err) {
    console.error("❌ Error in /mark-present-bulk:", err);
    res.status(500).json({ 
      message: "Internal server error",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});
// POST /api/student
router.post("/student", async (req, res) => {
  const { name, rollno, password, branch, batch, email, qrData, qrLink } =
    req.body;

  // Validate
  if (!name || !rollno || !password || !branch || !batch || !email) {
    return res
      .status(400)
      .json({ message: "All required fields must be provided" });
  }

  try {
    const existingStudent = await Student.findOne({ rollno });

    if (existingStudent) {
      return res
        .status(409)
        .json({ message: "Student with this rollno already exists" });
    }

    const newStudent = new Student({
      name,
      rollno,
      password,
      branch,
      batch,
      email,
      qrData,
      qrLink,
    });

    await newStudent.save();

    res
      .status(201)
      .json({ message: "Student added successfully", student: newStudent });
  } catch (error) {
    console.error("Error inserting student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/student/:rollno", async (req, res) => {
  const { rollno } = req.params;
  const updates = req.body;

  if (!rollno) {
    return res.status(400).json({ message: "Roll number is required" });
  }

  try {
    const updatedStudent = await Student.findOneAndUpdate(
      { rollno },
      { $set: updates },
      { new: true } // return the updated document
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json({
      message: "Student updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /api/students/:rollno
router.delete("/students/:rollno", async (req, res) => {
  const { rollno } = req.params;

  if (!rollno) {
    return res.status(400).json({ message: "Roll number is required" });
  }

  try {
    const deletedStudent = await Student.findOneAndDelete({ rollno });

    if (!deletedStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    return res.json({
      message: "Student deleted successfully",
      deletedStudent,
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /api/admin?adminId=ADMIN001
router.get("/admin", async (req, res) => {
  const { adminId } = req.query;

  if (!adminId) {
    return res.status(400).json({ message: "adminId is required." });
  }

  try {
    const admin = await Admin.findOne({
      adminId: new RegExp(`^${adminId}$`, "i"),
    });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    return res.json({
      adminId: admin.adminId,
      email: admin.email,
      name : admin.name,
      // password excluded intentionally for security
    });
  } catch (error) {
    console.error("Error fetching admin:", error);
    return res.status(500).json({ message: "Internal server error." });
  }
});

// Create a new faculty
router.post("/addnewfaculty", async (req, res) => {
  const { name, facultyid, passwordfa, email } = req.body;

  if (!name || !facultyid || !passwordfa || !email) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    const existing = await Faculty.findOne({ facultyid });
    if (existing)
      return res.status(409).json({ message: "Faculty already exists" });

    const newFaculty = new Faculty({ name, facultyid, passwordfa, email });
    const savedFaculty = await newFaculty.save();

    res
      .status(201)
      .json({ message: "Faculty added successfully", faculty: savedFaculty });
  } catch (err) {
    console.error("Add Faculty Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Update faculty (partial update)
router.patch("/:facultyid", async (req, res) => {
  const { facultyid } = req.params;
  const updates = req.body; // Can include name, passwordfa, email

  try {
    const updatedFaculty = await Faculty.findOneAndUpdate(
      { facultyid },
      { $set: updates },
      { new: true }
    );

    if (!updatedFaculty) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({
      message: "Faculty updated successfully",
      faculty: updatedFaculty,
    });
  } catch (err) {
    console.error("Update Faculty Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete faculty
router.delete("/:facultyid", async (req, res) => {
  const { facultyid } = req.params;

  try {
    const deleted = await Faculty.findOneAndDelete({ facultyid });

    if (!deleted) {
      return res.status(404).json({ message: "Faculty not found" });
    }

    res.json({ message: "Faculty deleted successfully", deleted });
  } catch (err) {
    console.error("Delete Faculty Error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// get absentees
router.get("/absentees", async (req, res) => {
  try {
    const { batch, date, course } = req.query;

    if (!batch || !date || !course) {
      return res
        .status(400)
        .json({ message: "Missing batch, date, or course" });
    }

    let Attendance;
    try {
      Attendance = getAttendanceModel(batch); // Ensure model exists
    } catch (err) {
      return res
        .status(404)
        .json({ message: `Batch collection not found: ${batch}` });
    }

    const absentees = await Attendance.find(
      {
        dailyLogs: {
          $elemMatch: {
            date: date,
            course: course,
            status: "absent",
          },
        },
      },
      { rollno: 1, _id: 0 }
    );

    const rollnos = absentees.map((student) => student.rollno);
    res.status(200).json(rollnos);
  } catch (err) {
    console.error("Error fetching absentees:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// POST /api/announcements
router.post("/announcements", async (req, res) => {
  try {
    const { postedby, title, subtitle, content, batches } = req.body;

    // Basic validation
    if (
      !postedby ||
      !title ||
      !subtitle ||
      !content ||
      !Array.isArray(batches) ||
      batches.length === 0
    ) {
      return res.status(400).json({ message: "All fields are required and batches must be a non-empty array." });
    }

    // Create and save announcement
    const newAnnouncement = new Announcement({
      postedby,
      title,
      subtitle,
      content,
      batches,
      createdAt: new Date(), // optional, auto-set by schema too
    });

    const saved = await newAnnouncement.save();
    res.status(201).json({
      message: "Announcement posted successfully",
      announcementId: saved._id,
    });

  } catch (error) {
    console.error("Error posting announcement:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
