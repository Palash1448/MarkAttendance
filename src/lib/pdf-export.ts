import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  calcStatus, fmtTime, hoursBetween, isWeekend, statusLabel, toDateId,
  type AttendanceDoc, type OfficeSettings,
} from "./attendance";

export function exportPdf(args: {
  email: string;
  fromDate: string;
  toDate: string;
  docs: AttendanceDoc[];
  office: OfficeSettings;
}) {
  const { email, fromDate, toDate, docs, office } = args;
  const byId: Record<string, AttendanceDoc> = {};
  for (const d of docs) byId[d.date] = d;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Attendance Report", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(90);
  doc.text(`User: ${email}`, 40, 72);
  doc.text(`Range: ${fromDate} to ${toDate}`, 40, 88);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 104);

  // Summary
  const start = new Date(fromDate);
  const end = new Date(toDate);
  let present = 0, late = 0, half = 0, absent = 0, leave = 0, totalHrs = 0, workedDays = 0;
  const rows: (string | number)[][] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) {
    const id = toDateId(d);
    const rec = byId[id];
    const weekend = isWeekend(d);
    const status = rec ? calcStatus(rec, office) : (weekend ? "leave" : "absent");
    const hrs = hoursBetween(rec?.punchInTime, rec?.punchOutTime);
    if (hrs > 0) { totalHrs += hrs; workedDays++; }
    if (status === "present") present++;
    else if (status === "late") late++;
    else if (status === "half_day") half++;
    else if (status === "leave") leave++;
    else if (status === "absent" && !weekend) absent++;
    rows.push([
      id,
      d.toLocaleDateString([], { weekday: "short" }),
      fmtTime(rec?.punchInTime),
      fmtTime(rec?.punchOutTime),
      hrs > 0 ? hrs.toFixed(2) : "—",
      statusLabel(status),
    ]);
  }

  autoTable(doc, {
    startY: 130,
    head: [["Metric", "Value"]],
    body: [
      ["Present", String(present)],
      ["Late", String(late)],
      ["Half Day", String(half)],
      ["Absent", String(absent)],
      ["Leave / Off", String(leave)],
      ["Total hours worked", totalHrs.toFixed(2)],
      ["Avg hours / worked day", workedDays ? (totalHrs / workedDays).toFixed(2) : "0.00"],
    ],
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: [45, 138, 158], textColor: 255 },
    theme: "grid",
    margin: { left: 40, right: 40 },
    tableWidth: pageW - 80,
  });

  autoTable(doc, {
    head: [["Date", "Day", "Punch In", "Punch Out", "Hours", "Status"]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [45, 138, 158], textColor: 255 },
    theme: "striped",
    margin: { left: 40, right: 40 },
  });

  doc.save(`attendance-${fromDate}_to_${toDate}.pdf`);
}
