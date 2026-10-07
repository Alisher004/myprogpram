import lessons from "./lessons.json";

export const LESSONS = lessons;

export function getLesson(id) {
  return LESSONS.find((l) => l.id === id);
}

// { 1: { 1: [lesson, ...], 2: [...] }, 2: {...} }
export function groupByMonthAndWeek(list = LESSONS) {
  const months = {};
  for (const lesson of list) {
    months[lesson.month] ??= {};
    months[lesson.month][lesson.week] ??= [];
    months[lesson.month][lesson.week].push(lesson);
  }
  return months;
}
