import React from 'react';
import BrandLogoOfficial from '../common/BrandLogoOfficial';
import { 
  Home, 
  Users, 
  Layers, 
  Activity, 
  ClipboardCheck, 
  TrendingUp, 
  CalendarDays, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut,
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
  // LISTA EXACTA DE ÍTEMS EN EL ORDEN ESPECIFICADO
  const menuItems = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'rutinas', label: 'Rutinas', icon: Layers },
    { id: 'ejercicios', label: 'Ejercicios', icon: Activity },
    { id: 'evaluaciones', label: 'Evaluaciones', icon: ClipboardCheck },
    { id: 'seguimiento', label: 'Seguimiento', icon: TrendingUp },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays },
    { id: 'finanzas', label: 'Planes y Pagos', icon: CreditCard },
    { id: 'informes', label: 'Informes', icon: BarChart3 },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  const handleItemClick = (id) => {
    onViewChange(id);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      {/* 1. LOGO DE CABECERA */}
      <div className="flex flex-col items-center justify-center pb-6 border-b border-[#1f1e24]">
        <BrandLogoOfficial size="md" />
      </div>

      {/* 2. LISTADO COMPLETO DE ÍTEMS DE NAVEGACIÓN */}
      <nav className="flex-1 my-5 space-y-1 overflow-y-auto pr-1">
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

      {/* 3. CERRAR SESIÓN (AL FINAL DEL MENÚ) */}
      <div className="pt-4 border-t border-[#1f1e24]">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium text-[#9ca3af] hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 text-left"
        >
          <LogOut className="w-5 h-5 shrink-0 text-[#9ca3af] hover:text-red-400" strokeWidth={1.9} />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* SIDEBAR ESCRITORIO (Fijo, visible en PC/Desktop md en adelante) */}
      <aside className="hidden md:flex flex-col w-[260px] lg:w-[275px] bg-[#0b0a0c] border-r border-[#1f1e24] min-h-screen shrink-0 select-none">
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
          <aside className="relative w-[280px] max-w-[85%] bg-[#0b0a0c] border-r border-[#1f1e24] h-full z-10 shadow-2xl flex flex-col animate-slide-right">
            {/* Botón cerrar modal */}
            <button
              onClick={onCloseMobile}
              className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-white bg-[#18171d] border border-[#1f1e24]"
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
