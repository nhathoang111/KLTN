import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    LayoutDashboard,
    School,
    Users,
    ShieldCheck,
    GraduationCap,
    BookOpen,
    CalendarDays,
    ClipboardList,
    ClipboardCheck,
    Megaphone,
    NotebookPen,
    LogOut,
    UserCircle,
} from "lucide-react";

import logo from "../../../../../assets/logo.jpg";

const LeftSideBar = ({ user, onLogout }) => {
    const location = useLocation();

    const getUserRole = () => {
        if (!user) return "GUEST";

        const roleName = user.role?.name?.toUpperCase();

        if (roleName === "SUPER_ADMIN") return "SUPER_ADMIN";
        if (roleName === "ADMIN") return "ADMIN";
        if (roleName === "TEACHER") return "TEACHER";
        if (roleName === "STUDENT") return "STUDENT";
        if (roleName === "PARENT") return "PARENT";

        return "GUEST";
    };

    const userRole = getUserRole();

    const getUserRoleLabel = () => {
        switch (userRole) {
            case "SUPER_ADMIN":
                return "Super Admin";
            case "ADMIN":
                return "Admin";
            case "TEACHER":
                return "Giáo viên";
            case "STUDENT":
                return "Học sinh";
            case "PARENT":
                return "Phụ huynh";
            default:
                return "Người dùng chưa đăng nhập";
        }
    };

    const isActive = (path) => {
        if (path === "/dashboard") return location.pathname === "/dashboard";
        return location.pathname.startsWith(path);
    };

    const iconByPath = (path) => {
        switch (path) {
            case "/dashboard":
                return LayoutDashboard;
            case "/schools":
                return School;
            case "/users":
                return Users;
            case "/roles":
                return ShieldCheck;
            case "/classes":
                return GraduationCap;
            case "/subjects":
                return BookOpen;
            case "/schedules":
                return CalendarDays;
            case "/exam-scores":
                return NotebookPen;
            case "/attendance":
                return ClipboardCheck;
            case "/assignments":
                return ClipboardList;
            case "/announcements":
                return Megaphone;
            case "/profile":
                return UserCircle;
            default:
                return School;
        }
    };

    const menuItems = useMemo(() => {
        const hasSelectedChild = !!localStorage.getItem('activeStudentId');
        const allMenuItems = [
            {
                path: "/dashboard",
                label: "Dashboard",
                roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "PARENT", "GUEST"],
            },

            { path: "/schools", label: "Quản lý trường học", roles: ["SUPER_ADMIN"] },
            { path: "/users", label: "Quản lý Admin trường", roles: ["SUPER_ADMIN"] },

            { path: "/users", label: "Quản lý người dùng", roles: ["ADMIN"] },
            { path: "/roles", label: "Quản lý phân quyền", roles: ["ADMIN"] },
            { path: "/classes", label: "Quản lý lớp học", roles: ["ADMIN"] },
            { path: "/subjects", label: "Quản lý môn học", roles: ["ADMIN"] },
            { path: "/schedules", label: "Quản lý thời khóa biểu", roles: ["ADMIN"] },
            { path: "/exam-scores", label: "Quản lý điểm số", roles: ["ADMIN"] },
            { path: "/attendance", label: "Quản lý điểm danh", roles: ["ADMIN"] },
            { path: "/announcements", label: "Thông báo & Tài liệu", roles: ["ADMIN"] },

            { path: "/classes", label: "Xem lớp phụ trách", roles: ["TEACHER"] },
            { path: "/exam-scores", label: "Nhập điểm", roles: ["TEACHER"] },
            { path: "/assignments", label: "Bài tập", roles: ["TEACHER"] },
            { path: "/schedules", label: "Xem thời khóa biểu", roles: ["TEACHER"] },
            { path: "/attendance", label: "Điểm danh", roles: ["TEACHER"] },
            { path: "/announcements", label: "Thông báo", roles: ["TEACHER"] },

            { path: "/profile", label: "Thông tin cá nhân", roles: ["STUDENT", "TEACHER"] },
            { path: "/schedules", label: "Xem thời khóa biểu", roles: ["STUDENT", "PARENT"] },
            { path: "/exam-scores", label: "Xem điểm", roles: ["STUDENT", "PARENT"] },
            { path: "/assignments", label: "Bài tập", roles: ["STUDENT"] },
            { path: "/announcements", label: "Thông báo", roles: ["STUDENT", "PARENT"] },
            { path: "/attendance", label: "Xem điểm danh", roles: ["PARENT","STUDENT"] },
        ];

        return allMenuItems
            .filter((item) => {
                // 1. Kiểm tra quyền truy cập cơ bản theo Role
                if (!item.roles.includes(userRole)) return false;

                // 2. Nếu là PHỤ HUYNH và CHƯA chọn con em -> Ẩn các chức năng chi tiết của học sinh
                if (userRole === "PARENT" && !hasSelectedChild) {
                    const studentRelatedPaths = [
                        "/schedules",
                        "/exam-scores",
                        "/announcements",
                        "/attendance"
                    ];
                    // Chỉ cho phép xem Dashboard và Profile nếu chưa chọn con
                    if (studentRelatedPaths.includes(item.path)) return false;
                }

                return true;
            })
            .map((item) => ({
                ...item,
                Icon: iconByPath(item.path),
            }));
    }, [userRole, location.pathname]); // Thêm location.pathname để re-calculate khi chuyển hướng

    return (
        <aside className="!w-[280px] border-r border-slate-200 bg-slate-50 !px-5 !py-6 flex flex-col">
            {/* LOGO */}
            <div className="flex items-center !gap-4 !mb-8">
                <img
                    src={logo}
                    alt="logo"
                    className="!w-[52px] !h-[52px] rounded-2xl object-cover"
                />

                <div>
                    <div className="!text-[22px] font-extrabold text-slate-900 text-center">
                        School
                    </div>

                    <div className="!text-[14px] text-slate-500 text-center">
                        Management System
                    </div>
                </div>
            </div>

            {/* USER ROLE */}
            {user && (
                <div className="!mb-6 text-center border-b border-slate-200 pb-6">
                    <div className="font-bold text-slate-900">{user.fullName}</div>
                    <div className="text-slate-500 !text-sm">{getUserRoleLabel()}</div>

                    {userRole === 'PARENT' && localStorage.getItem('activeStudentName') && (
                        <div className="!mt-4 !p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                            <div className="!text-[10px] uppercase tracking-wider text-emerald-600 font-bold !mb-1">Đang xem con:</div>
                            <div className="font-bold text-emerald-800 !text-sm !mb-2">
                                {localStorage.getItem('activeStudentName')}
                            </div>
                            <Link to="/dashboard" className="!text-[11px] text-emerald-600 hover:underline font-bold">
                                🔄 Đổi con khác
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* NAV */}
            <nav className="flex flex-col !gap-3">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    const Icon = item.Icon;

                    return (
                        <Link
                            key={item.path + item.label}
                            to={item.path}
                            className={`
                flex items-center !gap-4
                !px-4 !py-3
                rounded-xl
                !transition
                !duration-200
                text-slate-600
                hover:bg-white
                hover:!shadow-sm
                hover:!-translate-y-1
                ${active
                                    ? "bg-white text-emerald-600 shadow-sm border-emerald-100"
                                    : ""
                                }
              `}
                        >
                            <span
                                className={`
                  !w-9 !h-9
                  flex items-center justify-center
                  rounded-xl
                  ${active ? "bg-emerald-50" : "bg-slate-100"}
                `}
                            >
                                <Icon className="!w-[18px] !h-[18px]" />
                            </span>

                            <span className="font-semibold !text-[14px]">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* LOGOUT */}
            <button
                onClick={() => {
                    localStorage.removeItem('activeStudentId');
                    localStorage.removeItem('activeStudentName');
                    onLogout();
                }}
                className="
          !mt-12
          flex items-center justify-center !gap-2
          !py-3
          border border-slate-200
          rounded-xl
          text-red-500
          font-semibold
          hover:bg-white
          transition
          cursor-pointer
        "
            >
                <LogOut className="!w-[18px] !h-[18px]" />
                Đăng xuất
            </button>
        </aside>
    );
};

export default LeftSideBar;
