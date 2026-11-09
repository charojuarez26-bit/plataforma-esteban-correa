import React, { useState } from 'react';
import BrandLogoOfficial from '../common/BrandLogoOfficial';
import AboutModal from '../AboutModal';
import { 
  Home, 
  Users, 
  Layers, 
  Activity, 
  ClipboardCheck, 
  HeartPulse,
  TrendingUp, 
  CalendarDays, 
  CreditCard, 
  DollarSign,
  BarChart3, 
  Settings, 
  LogOut,
  Info,
  X
} from 'lucide-react';

export default function Sidebar({ 
  currentView, 
  onViewChange, 
  onLogout, 
  user,
  isOpenMobile = false,
  onCloseMobile = () => {}
}) {
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  // LISTA EXACTA DE ÍTEMS EN EL ORDEN ESPECIFICADO
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'clientes', label: 'Alumnos', icon: Users },
    { id: 'rutinas', label: 'Rutinas', icon: Layers },
    { id: 'ejercicios', label: 'Ejercicios', icon: Activity },
    { id: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
    { id: 'fichas-medicas', label: 'Fichas Médicas', icon: HeartPulse },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'pagos', label: 'Planes y Pagos', icon: CreditCard },
    { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  const handleItemClick = (id) => {
    onViewChange(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      {/* 1. LOGO DE CABECERA */}
      <div className="flex flex-col items-center justify-center pb-6 border-b border-gray-800 shrink-0">
        <BrandLogoOfficial size="md" />
      </div>

      {/* 2. LISTADO COMPLETO DE ÍTEMS DE NAVEGACIÓN */}
      <nav className="flex-1 my-5 space-y-1 overflow-y-auto no-scrollbar pr-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Soporta tanto 'inicio' como 'dashboard'
          const isActive = currentView === item.id || (item.id === 'inicio' && currentView === 'dashboard');

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm transition-all duration-200 text-left font-sans ${
                isActive
                  ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white font-bold shadow-lg shadow-red-950/60 tracking-wide'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#18171d] font-medium'
              }`}
            >
              <Icon 
                className={`w-5 h-5 shrink-0 transition-colors ${
                  isActive ? 'text-white' : 'text-[#9ca3af] group-hover:text-white'
                }`} 
                strokeWidth={isActive ? 2.3 : 1.9}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. ACCIONES INFERIORES: ACERCA DE & CERRAR SESIÓN */}
      <div className="pt-4 border-t border-gray-800 space-y-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            setIsAboutModalOpen(true);
            onCloseMobile();
          }}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#9ca3af] hover:text-white hover:bg-[#18171d] transition-all duration-200 text-left group"
        >
          <Info className="w-5 h-5 shrink-0 text-[#9ca3af] group-hover:text-white transition-colors" strokeWidth={1.9} />
          <span>Acerca de la app</span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium text-[#9ca3af] hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 text-left"
        >
          <LogOut className="w-5 h-5 shrink-0 text-[#9ca3af] hover:text-red-400" strokeWidth={1.9} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MODAL ACERCA DE (ABOUT) */}
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />

      {/* SIDEBAR ESCRITORIO (Fijo, visible en PC/Desktop md en adelante) */}
      <aside className="hidden md:flex flex-col w-64 h-full flex-shrink-0 bg-gray-950 border-r border-gray-800 select-none">
        {sidebarContent}
      </aside>

      {/* DRAWER MÓVIL (Con overlay para teléfonos y tablets) */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Fondo oscuro backdrop */}
          <div 
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
          />

          {/* Panel deslizante */}
          <aside className="relative w-64 max-w-[85%] bg-gray-950 border-r border-gray-800 h-full z-10 shadow-2xl flex flex-col animate-slide-right">
            {/* Botón cerrar modal */}
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white bg-[#18171d] border border-gray-800"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
