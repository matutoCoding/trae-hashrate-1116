import { NavLink, useLocation } from 'react-router-dom';
import { Home, Car, Receipt, Wallet, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', label: '首页', icon: Home },
  { path: '/wash', label: '洗车', icon: Car },
  { path: '/transactions', label: '账单', icon: Receipt },
  { path: '/quota', label: '额度', icon: Wallet },
  { path: '/pricing', label: '费率', icon: Clock },
];

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-safe">
      <div className="max-w-lg mx-auto flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'nav-link relative flex-1',
                isActive && 'active'
              )}
            >
              <div className="relative">
                <Icon 
                  size={22} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={cn(
                    'transition-all duration-300',
                    isActive && 'scale-110'
                  )}
                />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
                )}
              </div>
              <span className={cn(
                'text-xs transition-all duration-200',
                isActive ? 'font-medium' : 'font-normal'
              )}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
