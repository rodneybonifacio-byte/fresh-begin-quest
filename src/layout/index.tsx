import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import AppSidebar from '../components/sidebar/AppSidebar';
import AppTopbar from '../components/sidebar/AppTopbar';
import { PromoBannerRecarga } from '../components/PromoBannerRecarga';
import { MobileBottomNav } from '../components/mobile/MobileBottomNav';
import { MobileHeader } from '../components/mobile/MobileHeader';

export const LayoutBase = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen w-full bg-background relative">
            {/* Overlay - apenas mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar - hidden on mobile */}
            <AppSidebar isOpen={sidebarOpen} onClose={closeSidebar} />

            {/* Main content area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Desktop Topbar */}
                <div className="hidden lg:block">
                    <AppTopbar toggleSidebar={toggleSidebar} />
                </div>

                {/* Mobile Header */}
                <MobileHeader onMenuClick={toggleSidebar} />

                {/* Banner promocional */}
                <PromoBannerRecarga />

                {/* Page content - add bottom padding for mobile nav */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                <MobileBottomNav />
            </div>
        </div>
    );
};
