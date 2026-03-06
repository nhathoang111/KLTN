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
        <aside className="!w-[340px] border-l border-slate-200 bg-white flex flex-col">
            {/* TOP USER BAR */}
            <div className="!px-5 !py-4 border-b border-slate-200 flex items-center justify-between">
                <button
                    className="
            !w-11 !h-11
            rounded-2xl
            border border-slate-200
            bg-slate-50
            flex items-center justify-center
            text-slate-500
            hover:bg-white
            hover:!shadow-sm
            transition
            cursor-pointer
          "
                >
                    <Bell className="!w-5 !h-5" />
                </button>

                <button
                    className="
            flex items-center !gap-3
            !px-3 !py-2
            rounded-2xl
            hover:bg-slate-50
            transition
            cursor-pointer
          "
                >
                    <div className="!w-11 !h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                        {avatarName}
                    </div>

                    <div className="text-left">
                        <div className="font-semibold text-slate-900 !text-[14px] leading-none">
                            {displayName}
                        </div>
                        <div className="text-slate-500 !text-[12px] !mt-1">
                            School account
                        </div>
                    </div>

                    <ChevronDown className="!w-4 !h-4 text-slate-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto !px-5 !py-5">
                {/* CALENDAR */}
                <section className="bg-white">
                    <div className="flex items-center justify-between !mb-5">
                        <h3 className="font-bold text-slate-900 !text-[18px]">
                            {monthLabel}
                        </h3>

                        <div className="flex items-center !gap-2">
                            <button
                                onClick={handlePrevMonth}
                                className="
                  !w-9 !h-9
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  flex items-center justify-center
                  text-slate-500
                  hover:bg-white
                  transition
                  cursor-pointer
                "
                            >
                                <ChevronLeft className="!w-4 !h-4" />
                            </button>

                            <button
                                onClick={handleNextMonth}
                                className="
                  !w-9 !h-9
                  rounded-xl
                  border border-slate-200
                  bg-slate-50
                  flex items-center justify-center
                  text-slate-500
                  hover:bg-white
                  transition
                  cursor-pointer
                "
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

                                    {item.hasEvent && !item.isToday && item.currentMonth && (
                                        <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 !w-1.5 !h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* SCHEDULE */}
                <section className="!mt-8">
                    <div className="flex items-center justify-between !mb-4">
                        <h3 className="font-bold text-slate-900 !text-[18px]">Schedule</h3>
                        <span className="!text-[13px] text-slate-400 font-medium">
                            Today
                        </span>
                    </div>

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
                    !duration-200
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
                                        <Icon className={`!w-5 !h-5 ${item.iconColor}`} />
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold text-slate-900 !text-[14px] leading-5 truncate">
                                            {item.title}
                                        </div>

                                        <div className="!mt-1 text-slate-500 !text-[12px] leading-5">
                                            {item.date} lúc {item.time}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </div>
        </aside>
    );
};

export default RightSideBar;