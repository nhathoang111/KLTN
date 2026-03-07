import Dashboard from "../../features/dashboard/pages/Dashboard/Dashboard";
import SchoolListPage from "../../features/schools/pages/SchoolListPage/SchoolListPage";
import SchoolCreatePage from "../../features/schools/pages/SchoolCreatePage/SchoolCreatePage";
import SchoolEditPage from "../../features/schools/pages/SchoolEditPage/SchoolEditPage";
import ClassListPage from "../../features/classes/pages/ClassListPage/ClassListPage";
import ClassCreatePage from "../../features/classes/pages/ClassCreatePage/ClassCreatePage";
import ClassEditPage from "../../features/classes/pages/ClassEditPage/ClassEditPage";
import SubjectListPage from "../../features/subjects/pages/SubjectListPage/SubjectListPage";
import SubjectCreatePage from "../../features/subjects/pages/SubjectCreatePage/SubjectCreatePage";
import SubjectEditPage from "../../features/subjects/pages/SubjectEditPage/SubjectEditPage";
import UserListPage from "../../features/users/pages/UserListPage/UserListPage";
import UserCreatePage from "../../features/users/pages/UserCreatePage/UserCreatePage";
import UserEditPage from "../../features/users/pages/UserEditPage/UserEditPage";
import AssignmentListPage from "../../features/assignments/pages/AssignmentListPage/AssignmentListPage";
import ReportListPage from "../../features/reports/pages/ReportListPage/ReportListPage";
import DocumentListPage from "../../features/documents/pages/DocumentListPage/DocumentListPage";
import AnnouncementListPage from "../../features/announcements/pages/AnnouncementListPage/AnnouncementListPage";
import RoleManagement from "../../features/roles/pages/RoleManagement/RoleManagement";
import ExamScoreManagement from "../../features/exam-scores/pages/ExamScoreManagement/ExamScoreManagement";
import AttendanceManagement from "../../features/attendance/pages/AttendanceManagement/AttendanceManagement";
import RecordListPage from "../../features/records/pages/RecordListPage/RecordListPage";
import ScheduleListPage from "../../features/schedules/pages/ScheduleListPage/ScheduleListPage";

export const protectedRoutes = [
  { path: "dashboard", Component: Dashboard },
  { path: "schools", Component: SchoolListPage },
  { path: "schools/create", Component: SchoolCreatePage },
  { path: "schools/:id/edit", Component: SchoolEditPage },
  { path: "classes", Component: ClassListPage },
  { path: "classes/create", Component: ClassCreatePage },
  { path: "classes/:id/edit", Component: ClassEditPage },
  { path: "subjects", Component: SubjectListPage },
  { path: "subjects/create", Component: SubjectCreatePage },
  { path: "subjects/:id/edit", Component: SubjectEditPage },
  { path: "users", Component: UserListPage },
  { path: "users/create", Component: UserCreatePage },
  { path: "users/:id/edit", Component: UserEditPage },
  { path: "roles", Component: RoleManagement },
  { path: "assignments", Component: AssignmentListPage },
  { path: "reports", Component: ReportListPage },
  { path: "documents", Component: DocumentListPage },
  { path: "announcements", Component: AnnouncementListPage },
  { path: "exam-scores", Component: ExamScoreManagement },
  { path: "attendance", Component: AttendanceManagement },
  { path: "records", Component: RecordListPage },
  { path: "schedules", Component: ScheduleListPage },
];
