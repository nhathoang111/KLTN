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
    Megaphone,
    NotebookPen,
    LogOut,
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
            default:
                return "Người dùng";
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
            case "/assignments":
                return ClipboardList;
            case "/announcements":
                return Megaphone;
            default:
                return School;
        }
    };

    const menuItems = useMemo(() => {
        const allMenuItems = [
            {
                path: "/dashboard",
                label: "Dashboard",
                roles: ["SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT", "GUEST"],
            },

            { path: "/schools", label: "Quản lý trường học", roles: ["SUPER_ADMIN"] },
            { path: "/users", label: "Quản lý Admin trường", roles: ["SUPER_ADMIN"] },

            { path: "/users", label: "Quản lý người dùng", roles: ["ADMIN"] },
            { path: "/roles", label: "Quản lý phân quyền", roles: ["ADMIN"] },
            { path: "/classes", label: "Quản lý lớp học", roles: ["ADMIN"] },
            { path: "/subjects", label: "Quản lý môn học", roles: ["ADMIN"] },
            { path: "/schedules", label: "Quản lý thời khóa biểu", roles: ["ADMIN"] },
            { path: "/exam-scores", label: "Qu?n ly ?i?m s?", roles: ["ADMIN"] },
            { path: "/announcements", label: "Thông báo & Tài liệu", roles: ["ADMIN"] },

            { path: "/classes", label: "Xem lớp ph�?trách", roles: ["TEACHER"] },
            { path: "/exam-scores", label: "Nhập điểm", roles: ["TEACHER"] },
            { path: "/assignments", label: "Bài tập", roles: ["TEACHER"] },
            { path: "/schedules", label: "Xem thời khóa biểu", roles: ["TEACHER"] },
            { path: "/announcements", label: "Thông báo", roles: ["TEACHER"] },

            { path: "/schedules", label: "Xem thời khóa biểu", roles: ["STUDENT"] },
            { path: "/exam-scores", label: "Xem điểm", roles: ["STUDENT"] },
            { path: "/assignments", label: "Bài tập", roles: ["STUDENT"] },
            { path: "/announcements", label: "Thông báo", roles: ["STUDENT"] },
        ];

        return allMenuItems
            .filter((item) => item.roles.includes(userRole))
            .map((item) => ({
                ...item,
                Icon: iconByPath(item.path),
            }));
    }, [userRole]);

    return (
        <aside className="!w-[280px] border-r border-slate-200 bg-slate-50 !px-5 !py-6 flex flex-col">
            {/* LOGO */}
            <div className="flex items-center !gap-4 !mb-12">
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
                <div className="!mb-8 text-center">
                    <div className="font-bold text-slate-900">{user.fullName}</div>

                    <div className="text-slate-500 !text-sm">{getUserRoleLabel()}</div>
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
                                    ? "bg-white text-emerald-600 shadow-sm border border-emerald-100"
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
                onClick={onLogout}
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

