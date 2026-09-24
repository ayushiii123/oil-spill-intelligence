import DashboardHeader from "./DashboardHeader";
import DashboardSidebar from "./DashboardSidebar";

const DashboardLayout = ({
  activePage = "overview",
  onNavigate,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#020617] text-white">
      <DashboardHeader />

      <div className="flex min-h-[calc(100vh-64px)]">
        <DashboardSidebar
          activePage={activePage}
          onNavigate={onNavigate}
        />

        <main className="min-w-0 flex-1 overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1500px] px-5 py-6 sm:px-6 md:px-8 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;