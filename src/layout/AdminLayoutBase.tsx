import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AdminSidebar from '../components/sidebar/AdminSidebar';
import AppTopbar from '../components/sidebar/AppTopbar';

export const AdminLayoutBase = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Admin Sidebar */}
            <AdminSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar - apenas mobile */}
                <div className="lg:hidden">
                    <AppTopbar toggleSidebar={toggleSidebar} />
                </div>

                {/* Page content */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
