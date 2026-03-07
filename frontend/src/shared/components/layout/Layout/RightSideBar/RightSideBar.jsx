import React, { useMemo, useState } from "react";
import {
    Bell,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
    FileText,
    Trophy,
    CalendarCheck2,
    Megaphone,
    PanelRightClose,
    PanelRightOpen,
} from "lucide-react";

const scheduleMock = [
    {
        id: 1,
        title: "Họp giáo viên định kỳ",
        date: "09/06/2026",
        time: "13:00",
        icon: FileText,
        bg: "bg-emerald-50",
        iconColor: "text-emerald-600",
    },
    {
        id: 2,
        title: "Giải bóng đá học sinh",
        date: "21/06/2026",
        time: "08:00",
        icon: Trophy,
        bg: "bg-amber-50",
        iconColor: "text-amber-600",
    },
    {
        id: 3,
        title: "Họp phụ huynh cuối tháng",
        date: "24/06/2026",
        time: "15:00",
        icon: CalendarCheck2,
        bg: "bg-sky-50",
        iconColor: "text-sky-600",
    },
    {
        id: 4,
        title: "Thông báo kế hoạch học kỳ",
        date: "25/06/2026",
        time: "10:00",
        icon: Megaphone,
        bg: "bg-violet-50",
        iconColor: "text-violet-600",
    },
];

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RightSideBar = ({ user }) => {
    const today = new Date();

    const [collapsed, setCollapsed] = useState(false);

    const [currentDate, setCurrentDate] = useState(
        new Date(today.getFullYear(), today.getMonth(), 1)
    );

    const displayName = user?.fullName || "Người dùng";
    const avatarName = displayName?.charAt(0)?.toUpperCase() || "U";

    const monthLabel = currentDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
    });

    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();
        const prevMonthTotalDays = new Date(year, month, 0).getDate();

        const days = [];

        for (let i = firstDayIndex - 1; i >= 0; i--) {
            days.push({
                day: prevMonthTotalDays - i,
                currentMonth: false,
            });
        }

        for (let day = 1; day <= totalDays; day++) {
            const isToday =
                day === today.getDate() &&
                month === today.getMonth() &&
                year === today.getFullYear();

            days.push({
                day,
                currentMonth: true,
                isToday,
                hasEvent: [7, 14, 21, 25].includes(day),
            });
        }

        while (days.length % 7 !== 0) {
            days.push({
                day: days.length % 7,
                currentMonth: false,
            });
        }

        return days;
    }, [currentDate]);

    const handlePrevMonth = () => {
        setCurrentDate(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
        );
    };

    const handleNextMonth = () => {
        setCurrentDate(
            (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
        );
    };

    return (
        <aside
            className={`
        border-l border-slate-200
        bg-white
        flex flex-col
        transition-all
        duration-300
        ${collapsed ? "!w-[70px]" : "!w-[340px]"}
      `}
        >
            {/* TOP BAR */}
            <div className="!px-4 !py-4 border-b border-slate-200 flex items-center justify-between">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="
            !w-10 !h-10
            rounded-xl
            border border-slate-200
            bg-slate-50
            flex items-center justify-center
            text-slate-500
            hover:bg-white
            transition
          "
                >
                    {collapsed ? (
                        <PanelRightOpen className="!w-5 !h-5" />
                    ) : (
                        <PanelRightClose className="!w-5 !h-5" />
                    )}
                </button>

                {!collapsed && (
                    <button
                        className="
              !w-10 !h-10
              rounded-xl
              border border-slate-200
              bg-slate-50
              flex items-center justify-center
              text-slate-500
              hover:bg-white
              transition
            "
                    >
                        <Bell className="!w-5 !h-5" />
                    </button>
                )}
            </div>

            {collapsed ? null : (
                <>
                    {/* USER */}
                    <div className="!px-5 !py-4 border-b border-slate-200 flex items-center !gap-3">
                        <div className="!w-11 !h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                            {avatarName}
                        </div>

                        <div className="flex-1">
                            <div className="font-semibold text-slate-900 !text-[14px]">
                                {displayName}
                            </div>

                            <div className="text-slate-500 !text-[12px]">
                                School account
                            </div>
                        </div>

                        <ChevronDown className="!w-4 !h-4 text-slate-500" />
                    </div>

                    <div className="flex-1 overflow-y-auto !px-5 !py-5">
                        {/* CALENDAR */}
                        <section>
                            <div className="flex items-center justify-between !mb-5">
                                <h3 className="font-bold text-slate-900 !text-[18px]">
                                    {monthLabel}
                                </h3>

                                <div className="flex !gap-2">
                                    <button
                                        onClick={handlePrevMonth}
                                        className="!w-9 !h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
                                    >
                                        <ChevronLeft className="!w-4 !h-4" />
                                    </button>

                                    <button
                                        onClick={handleNextMonth}
                                        className="!w-9 !h-9 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
                                    >
                                        <ChevronRight className="!w-4 !h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-7 !gap-y-3 !gap-x-1 !mb-3">
                                {daysOfWeek.map((day) => (
                                    <div
                                        key={day}
                                        className="text-center text-slate-400 !text-[12px] font-semibold"
                                    >
                                        {day}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 !gap-y-3 !gap-x-1">
                                {calendarDays.map((item, index) => (
                                    <div
                                        key={`${item.day}-${index}`}
                                        className="flex items-center justify-center"
                                    >
                                        <button
                                            className={`
                        relative
                        !w-9 !h-9
                        rounded-full
                        !text-[13px]
                        font-semibold
                        transition
                        ${item.currentMonth
                                                    ? "text-slate-700 hover:bg-slate-100"
                                                    : "text-slate-300"
                                                }
                        ${item.isToday
                                                    ? "bg-emerald-500 text-white hover:bg-emerald-500"
                                                    : ""
                                                }
                      `}
                                        >
                                            {item.day}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* SCHEDULE */}
                        <section className="!mt-8">
                            <h3 className="font-bold text-slate-900 !text-[18px] !mb-4">
                                Schedule
                            </h3>

                            <div className="flex flex-col !gap-4">
                                {scheduleMock.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div
                                            key={item.id}
                                            className="
                        flex items-start !gap-3
                        !p-3
                        rounded-2xl
                        border border-slate-200
                        bg-slate-50/70
                        hover:bg-white
                        hover:!shadow-sm
                        hover:!-translate-y-1
                        !transition
                      "
                                        >
                                            <div
                                                className={`
                          !w-11 !h-11
                          rounded-2xl
                          flex items-center justify-center
                          ${item.bg}
                        `}
                                            >
                                                <Icon
                                                    className={`!w-5 !h-5 ${item.iconColor}`}
                                                />
                                            </div>

                                            <div>
                                                <div className="font-semibold text-slate-900 !text-[14px]">
                                                    {item.title}
                                                </div>

                                                <div className="text-slate-500 !text-[12px]">
                                                    {item.date} lúc {item.time}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </>
            )}
        </aside>
    );
};

export default RightSideBar;