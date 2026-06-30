import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiGrid, FiPackage, FiTag, FiTruck,
  FiShoppingCart, FiBarChart2, FiAlertTriangle,
  FiLogOut, FiUser, FiFileText
} from 'react-icons/fi';
const menuItems = [
  { path: '/dashboard',  label: 'Dashboard',   icon: FiGrid },
  { path: '/products',   label: 'Products',    icon: FiPackage },
  { path: '/categories', label: 'Categories',  icon: FiTag },
  { path: '/suppliers',  label: 'Suppliers',   icon: FiTruck },
  { path: '/billing',    label: 'POS Billing', icon: FiShoppingCart },
  { path: '/invoices',   label: 'Invoices',    icon: FiFileText },
  { path: '/reports',    label: 'Reports',     icon: FiBarChart2 },
  { path: '/low-stock',  label: 'Low Stock',   icon: FiAlertTriangle },
  { path: '/print-barcode', label: 'Print Barcodes', icon: FiTag },
];

const Sidebar = () => {
  const { user, logout } = useAuth();

  return (
    <div className="h-screen w-64 bg-gray-900 text-white flex 
                    flex-col fixed left-0 top-0 z-50">

      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white w-10 h-10 rounded-xl 
                          flex items-center justify-center text-lg font-bold">
            🏪
          </div>
          <div>
            <h1 className="font-bold text-sm">Hardware Store</h1>
            <p className="text-gray-400 text-xs">Inventory System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm 
               font-medium transition-all duration-200
               ${isActive
                 ? 'bg-blue-600 text-white'
                 : 'text-gray-400 hover:bg-gray-800 hover:text-white'
               }`
            }
          >
            <item.icon className="text-lg flex-shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 px-4 py-3 mb-2">
          <div className="bg-blue-600 rounded-full w-8 h-8 
                          flex items-center justify-center">
            <FiUser className="text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-gray-400 text-xs truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl
                     text-sm font-medium text-gray-400
                     hover:bg-red-900 hover:text-red-300
                     transition-all duration-200 w-full"
        >
          <FiLogOut className="text-lg" />
          Logout
        </button>
      </div>

    </div>
  );
};

export default Sidebar;