// Single source of truth for URLs. Every link and redirect goes through here.
//
// Staff areas live under configurable, non-obvious prefixes (set them in
// .env.local). This is NOT the security boundary — Firestore rules are; it just
// keeps the panels out of casual URL guessing and crawler noise.
const clean = (value, fallback) => "/" + String(value || fallback).replace(/^\/+|\/+$/g, "");

const STUDENT = "/cabinet";
const TEACHER = clean(import.meta.env.VITE_TEACHER_BASE, "kb-mentor");
const ADMIN = clean(import.meta.env.VITE_ADMIN_BASE, "kb-control");

export const ROLES = ["student", "teacher", "admin"];

export const ROUTES = {
  home: "/",
  program: "/programma",
  resources: "/resources",
  career: "/career",
  lesson: (id) => `/lesson/${id}`,
  login: "/login",
  register: "/register",

  student: {
    base: STUDENT,
    home: STUDENT,
    lessons: `${STUDENT}/lessons`,
    lesson: (id) => `${STUDENT}/lessons/${id}`,
    homework: `${STUDENT}/homework`,
    profile: `${STUDENT}/profile`,
  },
  teacher: {
    base: TEACHER,
    home: TEACHER,
    login: `${TEACHER}/login`,
    queue: `${TEACHER}/queue`,
    submissions: `${TEACHER}/submissions`,
    students: `${TEACHER}/students`,
  },
  admin: {
    base: ADMIN,
    home: ADMIN,
    login: `${ADMIN}/login`,
    users: `${ADMIN}/users`,
    submissions: `${ADMIN}/submissions`,
  },
};

export const homeFor = (role) =>
  role === "admin" ? ROUTES.admin.home : role === "teacher" ? ROUTES.teacher.home : ROUTES.student.home;

export const loginFor = (role) =>
  role === "admin" ? ROUTES.admin.login : role === "teacher" ? ROUTES.teacher.login : ROUTES.login;
