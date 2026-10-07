import Lesson from "../Lesson";
import { ROUTES } from "../../lib/routes";

export default function StudentLesson() {
  return <Lesson inShell lessonHref={ROUTES.student.lesson} backHref={ROUTES.student.lessons} />;
}
