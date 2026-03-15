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
import ProfilePageWrapper from "../../features/dashboard/pages/ProfilePageWrapper";

export const protectedRoutes = [
  { path: "dashboard", Component: Dashboard, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
  { path: "schools", Component: SchoolListPage, roles: ["SUPER_ADMIN"] },
  { path: "schools/create", Component: SchoolCreatePage, roles: ["SUPER_ADMIN"] },
  { path: "schools/:id/edit", Component: SchoolEditPage, roles: ["SUPER_ADMIN"] },
  { path: "classes", Component: ClassListPage, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
  { path: "classes/create", Component: ClassCreatePage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "classes/:id/edit", Component: ClassEditPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "subjects", Component: SubjectListPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "subjects/create", Component: SubjectCreatePage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "subjects/:id/edit", Component: SubjectEditPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "users", Component: UserListPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "users/create", Component: UserCreatePage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "users/:id/edit", Component: UserEditPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "roles", Component: RoleManagement, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "assignments", Component: AssignmentListPage, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
  { path: "reports", Component: ReportListPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "documents", Component: DocumentListPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "announcements", Component: AnnouncementListPage, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
  { path: "exam-scores", Component: ExamScoreManagement, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
  { path: "attendance", Component: AttendanceManagement, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER"] },
  { path: "records", Component: RecordListPage, roles: ["SUPER_ADMIN", "ADMIN"] },
  { path: "schedules", Component: ScheduleListPage, roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT"] },
  { path: "profile", Component: ProfilePageWrapper, roles: ["STUDENT", "TEACHER"] },
];
