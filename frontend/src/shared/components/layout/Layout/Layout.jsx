import React from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "../../../../features/auth/context/AuthContext";
import LeftSideBar from "./LeftSideBar/LeftSideBar";

const Layout = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <LeftSideBar user={user} onLogout={handleLogout} />

      <main className="flex-1 min-w-0">
        <div className="p-2!">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
