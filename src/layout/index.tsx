import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppSidebar from '../components/sidebar/AppSidebar';
import AppTopbar from '../components/sidebar/AppTopbar';

export const LayoutBase = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
            {/* Sidebar */}
            <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Topbar */}
                <AppTopbar toggleSidebar={toggleSidebar} />

                {/* Page content */}
                <main className="flex-1 mt-20 sm:mt-0 overflow-x-hidden overflow-y-auto bg-gray-50 dark:bg-slate-900 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
