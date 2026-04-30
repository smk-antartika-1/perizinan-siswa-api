import XLSX from "xlsx";
import { db } from "../../config/db.js";

async function getEntryExitRows() {
  return db("entry_exit_logs as l")
    .leftJoin("users as s", "s.id", "l.student_user_id")
    .leftJoin("classes as c", "c.id", "l.class_id")
    .leftJoin("permissions as p", "p.id", "l.permission_id")
    .select("l.created_at", "l.action", "l.note", "s.name as student_name", "s.nis", "c.name as class_name", "p.type")
    .orderBy("l.created_at", "desc");
}

export async function entryExitReport(req, res, next) {
  try {
    const rows = await getEntryExitRows();
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function exportEntryExitXlsx(req, res, next) {
  try {
    const rows = await getEntryExitRows();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "rekap");
    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="rekap-keluar-masuk.xlsx"');
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}
