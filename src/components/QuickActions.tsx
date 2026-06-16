import { useNavigate } from 'react-router-dom';
import { Car, Receipt, Wallet, Clock, Gift, Info } from 'lucide-react';

const actions = [
  { 
    id: 'wash', 
    label: '开始洗车', 
    icon: Car, 
    path: '/wash',
    color: 'from-primary-500 to-primary-600',
    bgColor: 'bg-primary-50'
  },
  { 
    id: 'transactions', 
    label: '消费明细', 
    icon: Receipt, 
    path: '/transactions',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50'
  },
  { 
    id: 'quota', 
    label: '额度管理', 
    icon: Wallet, 
    path: '/quota',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50'
  },
  { 
    id: 'pricing', 
    label: '费率查询', 
    icon: Clock, 
    path: '/pricing',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50'
  },
  { 
    id: 'cards', 
    label: '我的套餐', 
    icon: Gift, 
    path: '/quota',
    color: 'from-rose-500 to-rose-600',
    bgColor: 'bg-rose-50'
  },
  { 
    id: 'help', 
    label: '帮助中心', 
    icon: Info, 
    path: '/pricing',
    color: 'from-slate-500 to-slate-600',
    bgColor: 'bg-slate-50'
  },
];

export default function QuickActions() {
  const navigate = useNavigate();

  return (
    <div className="animate-fade-in-up opacity-0 animate-stagger-1">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">快捷操作</h3>
      <div className="grid grid-cols-3 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white border border-gray-100
                         hover:shadow-md hover:-translate-y-1 transition-all duration-300
                         active:scale-95"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl ${action.bgColor} flex items-center justify-center`}>
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center`}>
                  <Icon size={18} className="text-white" />
                </div>
              </div>
              <span className="text-xs font-medium text-gray-700">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
