## 1. 架构设计

```mermaid
graph TD
    subgraph "前端应用 (React)"
        A["UI组件层<br/>页面/组件"] --> B["状态管理层<br/>React Context + Hooks"]
        B --> C["业务逻辑层<br/>Service 服务"]
        C --> D["数据访问层<br/>API Client"]
    end
    
    subgraph "数据存储"
        E["LocalStorage<br/>用户会话/缓存数据"]
        F["Mock Data<br/>模拟后端数据"]
    end
    
    D --> F
    B --> E
    
    subgraph "核心业务模块"
        G["时段计费模块<br/>pricing.service"]
        H["额度管控模块<br/>quota.service"]
        I["账单生成模块<br/>billing.service"]
        J["消费明细模块<br/>transaction.service"]
    end
    
    C --> G
    C --> H
    C --> I
    C --> J
```

## 2. 技术描述
- **前端框架**：React@18 + TypeScript
- **构建工具**：Vite@5
- **样式方案**：TailwindCSS@3 + CSS变量
- **路由管理**：React Router DOM@6
- **状态管理**：React Context + useReducer
- **图表可视化**：Recharts（用于额度进度、消费统计）
- **图标库**：Lucide React
- **日期处理**：date-fns
- **后端**：无，使用Mock数据模拟
- **数据持久化**：LocalStorage存储用户状态和消费记录

## 3. 路由定义
| Route | 页面 | 用途 |
|-------|------|------|
| / | 首页 | 会员概览、快捷操作、最近消费 |
| /wash | 洗车消费 | 开始/结束洗车、实时计费、费用确认 |
| /transactions | 消费明细 | 账单列表、账单详情 |
| /quota | 额度管理 | 额度概览、次卡管理、重置记录 |
| /pricing | 费率查询 | 时段费率表、计费规则 |

## 4. 核心数据类型定义

```typescript
// 时段费率类型
interface TimeSlot {
  id: string;
  name: string;           // 高峰/平峰/低谷
  startTime: string;      // HH:mm 格式
  endTime: string;        // HH:mm 格式
  pricePerMinute: number; // 每分钟单价(元)
  color: string;          // 展示颜色
}

// 分段计费明细
interface BillingSegment {
  timeSlot: TimeSlot;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  amount: number;
}

// 会员额度类型
interface MemberQuota {
  memberId: string;
  monthlyFreeMinutes: number;   // 每月免费额度(分钟)
  usedMinutes: number;          // 已使用分钟
  remainingMinutes: number;     // 剩余分钟
  resetDate: Date;              // 下次重置日期
  lastResetDate: Date;          // 上次重置日期
}

// 次卡类型
interface TimeCard {
  id: string;
  name: string;
  totalMinutes: number;
  remainingMinutes: number;
  expireDate: Date;
  isActive: boolean;
}

// 消费账单类型
interface BillingRecord {
  id: string;
  memberId: string;
  startTime: Date;
  endTime: Date;
  totalDurationMinutes: number;
  segments: BillingSegment[];
  totalAmount: number;
  quotaDeductedMinutes: number;  // 额度抵扣分钟
  quotaDeductedAmount: number;   // 额度抵扣金额
  selfPaidAmount: number;        // 自费金额
  timeCardUsed?: {               // 次卡使用(可选)
    cardId: string;
    minutesUsed: number;
  };
  paymentMethod: string;
  status: 'pending' | 'paid' | 'cancelled';
  createdAt: Date;
}

// 会员信息
interface Member {
  id: string;
  name: string;
  phone: string;
  level: 'normal' | 'silver' | 'gold' | 'platinum';
  avatar?: string;
  registerDate: Date;
  quota: MemberQuota;
  timeCards: TimeCard[];
}
```

## 5. 核心业务模块架构

```mermaid
graph TD
    subgraph "pricing.service 时段计费模块"
        A1["getRateByTime(datetime)"] --> A2["根据时间获取对应时段费率"]
        B1["splitTimeBySlots(start, end)"] --> B2["跨时段拆分时间区间"]
        C1["calculateSegments(segments)"] --> C2["分段计算金额并合计"]
    end
    
    subgraph "quota.service 额度管控模块"
        D1["getCurrentQuota(memberId)"] --> D2["获取会员当前额度"]
        E1["resetMonthlyQuota(memberId)"] --> E2["月初重置额度"]
        F1["deductQuota(memberId, minutes)"] --> F2["扣减额度"]
        G1["checkQuotaReset()"] --> G2["检查是否需要重置额度"]
    end
    
    subgraph "billing.service 账单生成模块"
        H1["createBill(start, end, member)"] --> H2["生成消费账单"]
        I1["applyQuotaDeduction(bill)"] --> I3["应用额度抵扣"]
        J1["applyTimeCard(bill, cardId)"] --> J3["次卡核销"]
        K1["calculateFinalAmount(bill)"] --> K3["计算最终应付金额"]
    end
    
    subgraph "transaction.service 消费明细模块"
        L1["getBillList(memberId, filter)"] --> L2["获取账单列表"]
        M1["getBillDetail(billId)"] --> M2["获取账单详情"]
        N1["exportBill(billId)"] --> N2["导出账单"]
    end
```

## 6. 数据模型（LocalStorage存储结构）

### 6.1 数据模型定义

```mermaid
erDiagram
    MEMBER ||--o{ BILLING_RECORD : has
    MEMBER ||--|| MEMBER_QUOTA : has
    MEMBER ||--o{ TIME_CARD : owns
    BILLING_RECORD ||--|{ BILLING_SEGMENT : contains
    BILLING_RECORD }o--o| TIME_CARD : "may use"
    
    MEMBER {
        string id PK
        string name
        string phone
        string level
        string avatar
        date registerDate
    }
    
    MEMBER_QUOTA {
        string id PK
        string memberId FK
        int monthlyFreeMinutes
        int usedMinutes
        int remainingMinutes
        date resetDate
        date lastResetDate
    }
    
    TIME_CARD {
        string id PK
        string memberId FK
        string name
        int totalMinutes
        int remainingMinutes
        date expireDate
        boolean isActive
    }
    
    TIME_SLOT {
        string id PK
        string name
        string startTime
        string endTime
        decimal pricePerMinute
        string color
    }
    
    BILLING_RECORD {
        string id PK
        string memberId FK
        date startTime
        date endTime
        int totalDurationMinutes
        decimal totalAmount
        int quotaDeductedMinutes
        decimal quotaDeductedAmount
        decimal selfPaidAmount
        string paymentMethod
        string status
        date createdAt
    }
    
    BILLING_SEGMENT {
        string id PK
        string billingRecordId FK
        string timeSlotId FK
        date startTime
        date endTime
        int durationMinutes
        decimal amount
    }
```

### 6.2 初始化数据（Mock）

```typescript
// 时段费率配置表
const defaultTimeSlots: TimeSlot[] = [
  { id: '1', name: '低谷时段', startTime: '00:00', endTime: '07:00', pricePerMinute: 0.30, color: '#60A5FA' },
  { id: '2', name: '平峰时段', startTime: '07:00', endTime: '17:00', pricePerMinute: 0.50, color: '#34D399' },
  { id: '3', name: '高峰时段', startTime: '17:00', endTime: '20:00', pricePerMinute: 0.80, color: '#F97316' },
  { id: '4', name: '夜间平峰', startTime: '20:00', endTime: '24:00', pricePerMinute: 0.40, color: '#A78BFA' },
];

// 测试会员数据
const mockMember: Member = {
  id: 'M001',
  name: '张三',
  phone: '138****8888',
  level: 'gold',
  registerDate: new Date('2024-01-15'),
  quota: {
    memberId: 'M001',
    monthlyFreeMinutes: 120,
    usedMinutes: 45,
    remainingMinutes: 75,
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
    lastResetDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  },
  timeCards: [
    {
      id: 'TC001',
      name: '黄金会员专享次卡',
      totalMinutes: 300,
      remainingMinutes: 180,
      expireDate: new Date('2026-12-31'),
      isActive: true,
    }
  ]
};
```
