// Firestore access (client-only).
import {
  collection, doc, getDoc, getDocs, query, setDoc, where, orderBy,
} from "firebase/firestore";
import { getFirebase } from "./firebase";
import type { AttendanceDoc, OfficeSettings } from "./attendance";
import { DEFAULT_OFFICE } from "./attendance";

function userPath(uid: string) {
  return `users/${uid}`;
}

export async function getOfficeSettings(uid: string): Promise<OfficeSettings> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, `${userPath(uid)}/officeSettings/config`));
  if (!snap.exists()) return DEFAULT_OFFICE;
  return { ...DEFAULT_OFFICE, ...(snap.data() as Partial<OfficeSettings>) };
}

export async function saveOfficeSettings(uid: string, cfg: OfficeSettings): Promise<void> {
  const { db } = getFirebase();
  await setDoc(doc(db, `${userPath(uid)}/officeSettings/config`), cfg, { merge: true });
}

export async function getAttendance(uid: string, dateId: string): Promise<AttendanceDoc | null> {
  const { db } = getFirebase();
  const snap = await getDoc(doc(db, `${userPath(uid)}/attendance/${dateId}`));
  return snap.exists() ? (snap.data() as AttendanceDoc) : null;
}

export async function saveAttendance(
  uid: string,
  dateId: string,
  data: Partial<AttendanceDoc>,
): Promise<void> {
  const { db } = getFirebase();
  await setDoc(
    doc(db, `${userPath(uid)}/attendance/${dateId}`),
    { date: dateId, ...data },
    { merge: true },
  );
}

export async function getAttendanceRange(
  uid: string,
  fromDateId: string,
  toDateId: string,
): Promise<AttendanceDoc[]> {
  const { db } = getFirebase();
  const col = collection(db, `${userPath(uid)}/attendance`);
  const q = query(
    col,
    where("date", ">=", fromDateId),
    where("date", "<=", toDateId),
    orderBy("date", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as AttendanceDoc);
}
