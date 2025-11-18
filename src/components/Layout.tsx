import { ReactNode, useState } from 'react';
import { LayoutDashboard, GraduationCap, School, Users, DollarSign, FileText, Menu, X, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SessionServices } from '../services/sessionServices';
import Profile from './Profile';
import logo from '../assets/images/logo.png';
interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, path: '/' },
  { id: 'students', label: 'Élèves', icon: GraduationCap, path: '/students' },
  { id: 'Classes', label: 'Classes', icon: School, path: '/classes' },
  { id: 'teachers', label: 'Professeurs', icon: Users, path: '/teachers' },
  { id: 'finances', label: 'Finances', icon: DollarSign, path: '/finances' },
  // { id: 'reports', label: 'Bulletins', icon: FileText, path: '/reports' },
];

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();

  const user = SessionServices.getUser();
  const userName = user ? `${user.nom || ''} ${user.prenom || ''}`.trim() || 'Utilisateur' : 'Utilisateur';
  const userInitials = user
    ? `${user.nom?.[0] || ''}${user.prenom?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Profile */}
      <header className="fixed top-0 left-0 right-0 lg:left-64 bg-white border-b border-gray-200 z-30 h-16 flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4 flex-1">
          <div className="lg:hidden">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Centered School Name */}
        <div className="flex-1 flex justify-center">
          <h1 className="text-md font-bold text-gray-900 hidden md:block ">{SessionServices.getSchool().nom}</h1>
        </div>

        {/* Profile Avatar */}
        <div className="flex items-center gap-4 flex-1 justify-end">
          <span className="hidden lg:block text-sm font-medium text-gray-700">
            {userName}
          </span>
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
            <span className="hidden md:block lg:hidden text-sm font-medium text-gray-700">
              {userName}
            </span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 transition-transform duration-300 z-50 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64`}
      >
        <div className="p-6 border-b border-gray-200">
          {/* Logo Placeholder */}
          <div className="w-full flex items-center justify-center">
            {/* <div className="w-full h-24 border-2 border-gray-400 bg-white flex items-center justify-center rounded"> */}
             <img src={logo} alt="School Logo" className="max-h-full max-w-full" />
            {/* </div> */}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all hover:bg-gray-50 text-gray-700"
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content area */}
      <main className="lg:ml-64 pt-16 lg:pt-16">
        <div className="p-6 lg:p-8">{children}</div>
      </main>

      {/* Profile Modal */}
      <Profile isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
