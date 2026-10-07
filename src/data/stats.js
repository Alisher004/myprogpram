import { collection, getCountFromServer, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

// Aggregate counts run on the server: one cheap read each, no documents downloaded
const count = (q) => getCountFromServer(q).then((snap) => snap.data().count);

export const countUsersByRole = (role) => count(query(collection(db, "users"), where("role", "==", role)));
export const countSubmissionsByStatus = (status) =>
  count(query(collection(db, "submissions"), where("status", "==", status)));
export const countReviewedBy = (uid) => count(query(collection(db, "submissions"), where("reviewedBy", "==", uid)));

export const newestUsersQuery = (max = 5) => query(collection(db, "users"), orderBy("createdAt", "desc"), limit(max));
